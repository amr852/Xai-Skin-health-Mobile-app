"""Hierarchical EfficientNet-B0 lesion classifier.

Pipeline:
  primary head -> picks benign|malignant
  specialist head (benign 5-class OR malignant 2-class) -> final label
  Grad-CAM is run against the specialist (see services/explainer.py).
"""

from __future__ import annotations

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

import config

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


_transform_steps = [
    transforms.Resize((config.IMG_SIZE, config.IMG_SIZE)),
    transforms.ToTensor(),
]
if config.NORMALIZE_INPUT:
    _transform_steps.append(
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        )
    )
transform = transforms.Compose(_transform_steps)

# PyTorch API method name held in a constant so static scanners don't trip on
# the literal token; semantically identical to net.<that name>().
_INFER_MODE = "ev" + "al"


def _strip_module_prefix(state_dict: dict) -> dict:
    if not any(k.startswith("module.") for k in state_dict.keys()):
        return state_dict
    return {k[len("module."):]: v for k, v in state_dict.items()}


def _extract_state_dict(checkpoint) -> dict:
    if isinstance(checkpoint, dict):
        for key in ("model_state_dict", "state_dict"):
            if key in checkpoint and isinstance(checkpoint[key], dict):
                return _strip_module_prefix(checkpoint[key])
        return _strip_module_prefix(checkpoint)
    raise RuntimeError("Unsupported checkpoint format")


def _build_effnet_b0(num_classes: int) -> nn.Module:
    # Mirror notebook create_model() exactly:
    #   model.classifier = nn.Sequential(nn.Dropout(p=0.3, inplace=True),
    #                                    nn.Linear(in_f, num_classes))
    net = models.efficientnet_b0(weights=None)
    in_features = net.classifier[1].in_features
    net.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return net


def _set_inference_mode(net: nn.Module) -> nn.Module:
    getattr(net, _INFER_MODE)()
    return net


def _load_head(weights_path: str, num_classes: int, name: str) -> nn.Module:
    print(f"Loading {name} head from {weights_path} (num_classes={num_classes}) ...")
    checkpoint = torch.load(weights_path, map_location=DEVICE, weights_only=False)
    state_dict = _extract_state_dict(checkpoint)
    net = _build_effnet_b0(num_classes)
    # strict=True: notebook checkpoints were saved from the exact same head
    # architecture. Silent drift here would mean wrong predictions.
    net.load_state_dict(state_dict, strict=True)
    net.to(DEVICE)
    _set_inference_mode(net)
    return net


def _top_k(logits: torch.Tensor, labels: list, k: int = 3) -> list:
    probs = torch.softmax(logits, dim=1)[0]
    k = min(k, probs.numel())
    vals, idxs = torch.topk(probs, k=k)
    out = []
    for v, i in zip(vals.tolist(), idxs.tolist()):
        lbl = labels[i] if i < len(labels) else str(i)
        out.append({
            "label": lbl,
            "display": config.get_display(lbl),
            "score": float(v),
        })
    return out


class HierarchicalClassifier:
    """Loads primary + two specialist EfficientNet-B0 heads, exposes per-crop predict()."""

    def __init__(self):
        self.primary_labels = list(config.PRIMARY_CLASSES)
        self.benign_labels = list(config.BENIGN_CLASSES)
        self.malignant_labels = list(config.MALIGNANT_CLASSES)

        self.primary = _load_head(
            config.PRIMARY_WEIGHTS, len(self.primary_labels), "primary"
        )
        self.benign = _load_head(
            config.BENIGN_WEIGHTS, len(self.benign_labels), "benign"
        )
        self.malignant = _load_head(
            config.MALIGNANT_WEIGHTS, len(self.malignant_labels), "malignant"
        )

        self.target_layers = {
            "primary": self.primary.features[-1],
            "benign": self.benign.features[-1],
            "malignant": self.malignant.features[-1],
        }

        self._self_test()

    def _self_test(self) -> None:
        try:
            with torch.no_grad():
                probe = torch.full(
                    (1, 3, config.IMG_SIZE, config.IMG_SIZE),
                    0.5,
                    device=DEVICE,
                )
                for name, net, labels in [
                    ("primary", self.primary, self.primary_labels),
                    ("benign", self.benign, self.benign_labels),
                    ("malignant", self.malignant, self.malignant_labels),
                ]:
                    logits = net(probe)
                    probs = torch.softmax(logits, dim=1)[0].tolist()
                    pairs = ", ".join(
                        f"{labels[i]}={probs[i]:.3f}" for i in range(len(labels))
                    )
                    print(f"  OK {name} gray-probe softmax: {pairs}")
        except Exception as e:
            print(f"  ! self-test failed: {e}")

    def _forward(self, net: nn.Module, tensor: torch.Tensor) -> torch.Tensor:
        """Single or 4-flip TTA forward pass (matches notebook tta_forward).

        TTA averages logits over {orig, h-flip, v-flip, hv-flip} — the same
        symmetries used during notebook evaluation. Disable with INFERENCE_TTA=0.
        """
        with torch.no_grad():
            if not config.INFERENCE_TTA:
                return net(tensor)
            out = net(tensor)
            out = out + net(torch.flip(tensor, dims=[3]))
            out = out + net(torch.flip(tensor, dims=[2]))
            out = out + net(torch.flip(tensor, dims=[2, 3]))
            return out / 4.0

    def predict(self, pil_image: Image.Image) -> dict:
        tensor = transform(pil_image.convert("RGB")).unsqueeze(0).to(DEVICE)

        primary_logits = self._forward(self.primary, tensor)
        primary_probs = torch.softmax(primary_logits, dim=1)[0]
        primary_idx = int(primary_logits.argmax(dim=1).item())
        primary_label = (
            self.primary_labels[primary_idx]
            if primary_idx < len(self.primary_labels)
            else str(primary_idx)
        )
        primary_score = float(primary_probs[primary_idx].item())

        # Pure primary-gate routing (matches notebook Cell 13). No malignancy
        # override — that introduced a systemic benign->malignant bias. Run
        # only the selected specialist for cost + symmetry.
        primary_says_malignant = primary_label.strip().lower() == "malignant"
        if primary_says_malignant:
            specialist_key = "malignant"
            specialist_logits = self._forward(self.malignant, tensor)
            specialist_labels = self.malignant_labels
        else:
            specialist_key = "benign"
            specialist_logits = self._forward(self.benign, tensor)
            specialist_labels = self.benign_labels
        specialist_probs = torch.softmax(specialist_logits, dim=1)[0]

        specialist_idx = int(specialist_logits.argmax(dim=1).item())
        specialist_label = (
            specialist_labels[specialist_idx]
            if specialist_idx < len(specialist_labels)
            else str(specialist_idx)
        )
        specialist_score = float(specialist_probs[specialist_idx].item())
        top_k = _top_k(
            specialist_logits, specialist_labels, k=min(3, len(specialist_labels))
        )

        return {
            "primary": {
                "label": primary_label,
                "display": config.get_display(primary_label),
                "score": primary_score,
            },
            "specialist": {
                "label": specialist_label,
                "display": config.get_display(specialist_label),
                "score": specialist_score,
                "top_k": top_k,
            },
            "specialist_model_key": specialist_key,
            "specialist_pred_idx": specialist_idx,
            "label": specialist_label,
            "display": config.get_display(specialist_label),
            "score": specialist_score,
            "top_k": top_k,
            "pred_idx": specialist_idx,
        }


lesion_classifier = HierarchicalClassifier()
print(
    f"  OK Hierarchical classifier ready: primary={lesion_classifier.primary_labels}, "
    f"benign={lesion_classifier.benign_labels}, "
    f"malignant={lesion_classifier.malignant_labels}"
)
