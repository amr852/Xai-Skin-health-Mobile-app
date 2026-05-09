"""ResNet-50 lesion classifier (single crop)."""

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


def _load_resnet():
    print(f"Loading model from {config.MODEL_PATH} …")
    checkpoint = torch.load(config.MODEL_PATH, map_location=DEVICE, weights_only=False)

    if isinstance(checkpoint, dict):
        state_dict = (
            checkpoint.get("model_state_dict")
            or checkpoint.get("state_dict")
            or checkpoint
        )
    else:
        state_dict = checkpoint

    fc_weight = state_dict.get("fc.weight")
    num_classes = (
        fc_weight.shape[0] if fc_weight is not None else config.NUM_CLASSES
    )
    print(f"  → {num_classes} output classes detected in checkpoint")
    print(f"  → normalization enabled: {config.NORMALIZE_INPUT}")

    class_names = list(config.CLASS_NAMES)
    if num_classes != len(class_names):
        print(
            f"  ⚠️  CLASS_NAMES has {len(class_names)} entries but checkpoint "
            f"has {num_classes} outputs — falling back to numeric labels."
        )
        class_names = [f"class_{i}" for i in range(num_classes)]

    model = models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    model.load_state_dict(state_dict)
    model = model.to(DEVICE)
    model.eval()

    target_layer = model.layer4[-1].conv3
    return model, target_layer, class_names


model, target_layer, CLASS_NAMES = _load_resnet()
print(f"  ✅ Active CLASS_NAMES ({len(CLASS_NAMES)}): {CLASS_NAMES}")


def top_k_predictions(logits: torch.Tensor, k: int = 3) -> list:
    probs = torch.softmax(logits, dim=1)[0]
    k = min(k, probs.numel())
    vals, idxs = torch.topk(probs, k=k)
    out = []
    for v, i in zip(vals.tolist(), idxs.tolist()):
        label = CLASS_NAMES[i] if i < len(CLASS_NAMES) else str(i)
        out.append({"label": label, "score": float(v)})
    return out


class LesionClassifier:
    def predict(self, pil_image: Image.Image) -> dict:
        """Return diagnosis dict: label, score, top_k (len 3)."""
        tensor = transform(pil_image).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            logits = model(tensor)
        pred_idx = int(logits.argmax(dim=1).item())
        probs = torch.softmax(logits, dim=1)[0]
        pred_score = float(probs[pred_idx].item())
        label = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else str(pred_idx)
        top_k = top_k_predictions(logits, k=3)
        return {
            "label": label,
            "score": pred_score,
            "top_k": top_k,
            "pred_idx": pred_idx,
        }


lesion_classifier = LesionClassifier()
