"""MobileNetV2 7-class HAM10000 skin lesion classifier (Keras/TF).

Pipeline: PIL image → MobileNetV2 preprocess_input (224×224, [-1,1])
          → 4-flip TTA → softmax → top-k labels.
Grad-CAM target: out_relu (last activated feature map before global avg pool).
"""

from __future__ import annotations

import os

import numpy as np
from PIL import Image

import config
from services.preprocess import flip_array, pil_to_array


def _load_keras_model():
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    import tensorflow as tf
    path = config.KERAS_MODEL_PATH
    if not os.path.isfile(path):
        raise FileNotFoundError(
            f"Keras model not found: {path}\n"
            "Place mobilenetv2_ham7.h5 under model-server/weights/"
        )
    print(f"Loading Keras model from {path} ...")
    model = tf.keras.models.load_model(path, compile=False)
    print(f"  OK model loaded: input={model.input_shape} output={model.output_shape}")
    return model


def _softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = logits / max(temperature, 1e-6)
    e = np.exp(z - z.max())
    return e / e.sum()


def _top_k(probs: np.ndarray, labels: list[str], k: int = 3) -> list[dict]:
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


class KerasClassifier:
    """Single MobileNetV2 → 7-class prediction with optional 4-flip TTA."""

    def __init__(self) -> None:
        self.model = _load_keras_model()
        self.labels = list(config.ALL_CLASSES)
        self._self_test()

    def _self_test(self) -> None:
        try:
            dummy = np.zeros((1, config.IMG_SIZE, config.IMG_SIZE, 3), dtype=np.float32)
            out = self.model(dummy, training=False).numpy()[0]
            probs = _softmax(out)
            top3 = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)[:3]
            pairs = ", ".join(f"{self.labels[i]}={probs[i]:.3f}" for i in top3)
            print(f"  OK MobileNetV2 gray-probe top-3: {pairs}")
        except Exception as e:
            print(f"  ! self-test failed: {e}")

    def _forward(self, arr: np.ndarray) -> np.ndarray:
        """Run model on (1,H,W,3) array; returns raw logits (1,7)."""
        return self.model(arr, training=False).numpy()

    def _forward_tta(self, arr: np.ndarray) -> np.ndarray:
        """4-flip TTA: orig + h-flip + v-flip + hv-flip, averaged."""
        out = self._forward(arr)
        out = out + self._forward(flip_array(arr, axis=2))   # horizontal
        out = out + self._forward(flip_array(arr, axis=1))   # vertical
        out = out + self._forward(flip_array(flip_array(arr, axis=1), axis=2))
        return out / 4.0

    def predict(self, pil_image: Image.Image, tag: str = "single") -> dict:
        """Classify a PIL image. Returns structured result dict."""
        arr = pil_to_array(pil_image)

        if config.INFERENCE_TTA:
            logits = self._forward_tta(arr)[0]
        else:
            logits = self._forward(arr)[0]

        probs = _softmax(logits, config.INFERENCE_TEMPERATURE)
        pred_idx = int(np.argmax(probs))
        pred_label = self.labels[pred_idx]
        pred_score = float(probs[pred_idx])

        top_k = _top_k(probs, self.labels, k=min(5, len(self.labels)))
        low_conf = pred_score < config.LOW_CONFIDENCE_THRESHOLD
        is_malignant = pred_label in config.MALIGNANT_LABELS

        if config.DEBUG_INFERENCE:
            print(
                f"[predict] {tag}: {pred_label}({pred_score:.3f}) "
                f"top_k={[(x['label'], x['score']) for x in top_k]}"
            )

        return {
            "primary": {
                "label": "malignant" if is_malignant else "benign",
                "display": "Malignant" if is_malignant else "Benign",
                "score": pred_score,
            },
            "specialist": {
                "label": pred_label,
                "display": config.get_display(pred_label),
                "score": pred_score,
                "top_k": top_k,
            },
            "specialist_model_key": "mobilenetv2",
            "specialist_pred_idx": pred_idx,
            "label": pred_label,
            "display": config.get_display(pred_label),
            "score": pred_score,
            "top_k": top_k,
            "pred_idx": pred_idx,
            "uncertainty": {
                "low_confidence": low_conf,
                "warning": config.LOW_CONFIDENCE_MESSAGE if low_conf else None,
            },
        }


lesion_classifier = KerasClassifier()
print(f"  OK MobileNetV2 classifier ready: {config.NUM_CLASSES} classes")
