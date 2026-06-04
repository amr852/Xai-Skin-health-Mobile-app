"""Flat EfficientNet-B4 skin lesion classifier (efficientnet_pytorch).

Pipeline:
  Single EfficientNet-B4 head → 7-class flat prediction
  Labels: AK BCC BKL DF MEL NV VASC

Preprocessing: Resize(380,380, BICUBIC) → ToTensor → Normalize(ImageNet mean/std)
Grad-CAM target: model._conv_head  (1792-ch final conv before avgpool)
"""

from __future__ import annotations

import os

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

import config
from services.preprocess import flip_tensor, pil_to_tensor


# ── Model loading ─────────────────────────────────────────────────────────────

def _load_effnet_b4(num_classes: int, path: str) -> nn.Module:
    from efficientnet_pytorch import EfficientNet

    if not os.path.isfile(path):
        raise FileNotFoundError(f"EfficientNet-B4 weights not found: {path}")

    model = EfficientNet.from_name("efficientnet-b4")
    model._fc = nn.Linear(model._fc.in_features, num_classes)
    state = torch.load(path, map_location="cpu", weights_only=True)
    model.load_state_dict(state, strict=True)
    model.eval()
    print(f"  OK loaded {path}  ({num_classes} classes)")
    return model


# ── Inference helpers ─────────────────────────────────────────────────────────

def _softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = logits / max(temperature, 1e-6)
    e = np.exp(z - z.max())
    return e / e.sum()


def _top_k(probs: np.ndarray, labels: list[str], k: int = 5) -> list[dict]:
    k = min(k, len(probs))
    idxs = np.argsort(probs)[::-1][:k]
    return [
        {
            "label": labels[i],
            "display": config.get_display(labels[i]),
            "score": float(probs[i]),
        }
        for i in idxs
    ]


def _forward(model: nn.Module, tensor: torch.Tensor) -> np.ndarray:
    with torch.no_grad():
        return model(tensor).numpy()


def _forward_tta(model: nn.Module, tensor: torch.Tensor) -> np.ndarray:
    """4-flip TTA: original + h-flip + v-flip + hv-flip, mean-pooled."""
    out  = _forward(model, tensor)
    out += _forward(model, flip_tensor(tensor, 3))
    out += _forward(model, flip_tensor(tensor, 2))
    out += _forward(model, flip_tensor(flip_tensor(tensor, 2), 3))
    return out / 4.0


# ── Classifier ────────────────────────────────────────────────────────────────

class FlatClassifier:
    """Single EfficientNet-B4 head: flat 7-class prediction."""

    def __init__(self) -> None:
        print("Loading EfficientNet-B4 flat classifier …")
        self.model = _load_effnet_b4(config.NUM_CLASSES, config.MODEL_WEIGHTS)
        self._self_test()

    def _self_test(self) -> None:
        dummy = torch.zeros(1, 3, config.IMG_SIZE, config.IMG_SIZE)
        try:
            with torch.no_grad():
                out = self.model(dummy).numpy()[0]
            probs = _softmax(out)
            top1 = config.ALL_CLASSES[int(np.argmax(probs))]
            print(f"  OK flat probe -> {top1} ({probs.max():.3f})")
        except Exception as e:
            print(f"  ! flat self-test failed: {e}")

    def predict(self, pil_image: Image.Image, tag: str = "single") -> dict:
        """Classify with the flat B4 head.

        Returns a dict compatible with the scan pipeline and GradCAM explainer.
        Keys: label, display, score, pred_idx, top_k, specialist (alias),
              primary (derived benign|malignant for frontend banner),
              specialist_model_key, specialist_pred_idx, uncertainty.
        """
        tensor = pil_to_tensor(pil_image)

        raw = (
            _forward_tta(self.model, tensor)
            if config.INFERENCE_TTA
            else _forward(self.model, tensor)
        )
        probs     = _softmax(raw[0], config.INFERENCE_TEMPERATURE)
        idx       = int(np.argmax(probs))
        label     = config.ALL_CLASSES[idx]
        score     = float(probs[idx])
        top_k_list = _top_k(probs, config.ALL_CLASSES)
        low_conf  = score < config.LOW_CONFIDENCE_THRESHOLD

        # Derive coarse benign/malignant from the flat label for the UI banner.
        primary_label = "malignant" if label in config.MALIGNANT_LABELS else "benign"

        if config.DEBUG_INFERENCE:
            print(f"[predict] {tag}: {label}({score:.3f}) primary={primary_label}")

        specialist_dict = {
            "label":   label,
            "display": config.get_display(label),
            "score":   score,
            "top_k":   top_k_list,
        }
        return {
            "label":   label,
            "display": config.get_display(label),
            "score":   score,
            "pred_idx": idx,
            "top_k":   top_k_list,
            # scan.py / explainer.py compat keys
            "specialist":          specialist_dict,
            "specialist_model_key": "flat",
            "specialist_pred_idx":  idx,
            "primary": {
                "label":   primary_label,
                "display": primary_label.capitalize(),
                "score":   score,
            },
            "uncertainty": {
                "low_confidence": low_conf,
                "warning": config.LOW_CONFIDENCE_MESSAGE if low_conf else None,
            },
        }


lesion_classifier = FlatClassifier()
print(f"  OK flat classifier ready: {config.NUM_CLASSES} classes — {config.ALL_CLASSES}")
