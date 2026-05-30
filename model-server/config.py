"""Configuration for the model server — MobileNetV2 7-class HAM10000 classifier.

Single Keras MobileNetV2 trained on HAM10000 (7 skin-disease classes).
Grad-CAM targets out_relu (last activated feature map before global avg pool).
"""

from __future__ import annotations

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# HAM10000 classes in alphabetical (training) order — index order matters.
ALL_CLASSES: list[str] = [
    "akiec",
    "bcc",
    "bkl",
    "df",
    "mel",
    "nv",
    "vasc",
]

NUM_CLASSES = len(ALL_CLASSES)

# Human-friendly display labels.
LABEL_DISPLAY: dict[str, str] = {
    "akiec": "Actinic Keratosis",
    "bcc":   "Basal Cell Carcinoma",
    "bkl":   "Benign Keratosis",
    "df":    "Dermatofibroma",
    "mel":   "Melanoma",
    "nv":    "Melanocytic Nevus",
    "vasc":  "Vascular Lesion",
}

# Triage severity for the mobile UI.
SEVERITY: dict[str, str] = {
    "mel":   "urgent",
    "bcc":   "urgent",
    "akiec": "check",
    "vasc":  "check",
    "bkl":   "stable",
    "df":    "stable",
    "nv":    "stable",
}

# Classes considered malignant for primary/specialist split.
MALIGNANT_LABELS: set[str] = {"mel", "bcc", "akiec"}

IMG_SIZE = int(os.environ.get("IMG_SIZE", "224"))

# Model weights.
_WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")
KERAS_MODEL_PATH = os.environ.get(
    "KERAS_MODEL_PATH", os.path.join(_WEIGHTS_DIR, "mobilenetv2_ham7.h5")
)

# Grad-CAM target layer name inside the Keras model.
GRADCAM_LAYER = os.environ.get("GRADCAM_LAYER", "out_relu")

MODEL_NAME = "mobilenetv2_ham7"

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "skinsense")
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads"))

BLUR_THRESHOLD = float(os.environ.get("BLUR_THRESHOLD", "20.0"))
LOW_LIGHT_THRESHOLD = float(os.environ.get("LOW_LIGHT_THRESHOLD", "10.0"))

# MobileNetV2 preprocess_input maps [0,255] → [-1,1]; no ImageNet normalization.
NORMALIZE_INPUT = False

# 4-flip TTA at inference.
INFERENCE_TTA = os.environ.get("INFERENCE_TTA", "1").strip().lower() in {
    "1", "true", "yes", "on",
}

# Temperature scaling for softmax calibration.
INFERENCE_TEMPERATURE = float(os.environ.get("INFERENCE_TEMPERATURE", "1.0"))
LOW_CONFIDENCE_THRESHOLD = float(os.environ.get("LOW_CONFIDENCE_THRESHOLD", "0.45"))
LOW_CONFIDENCE_MESSAGE = (
    "Low confidence — consider retaking the photo or consulting a dermatologist."
)

# Debug.
DEBUG_INFERENCE = os.environ.get("DEBUG_INFERENCE", "0").strip().lower() in {
    "1", "true", "yes", "on",
}
INFERENCE_DEBUG_DIR = os.environ.get(
    "INFERENCE_DEBUG_DIR", os.path.join(BASE_DIR, "debug_inference")
)

YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", os.path.join(BASE_DIR, "best.pt"))
YOLO_CONF_THRESHOLD = float(os.environ.get("YOLO_CONF_THRESHOLD", "0.25"))
YOLO_STRICT_ARCH = os.environ.get("YOLO_STRICT_ARCH", "0").strip().lower() in (
    "1", "true", "yes", "on",
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def get_display(label: str) -> str:
    return LABEL_DISPLAY.get(label, label or "")


def get_severity(label: str) -> str:
    return SEVERITY.get((label or "").strip(), "check")


# Back-compat alias.
CLASS_NAMES = list(ALL_CLASSES)
