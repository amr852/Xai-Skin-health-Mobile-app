"""Configuration — flat ResNet50 classifier (torchvision).

Pipeline: single ResNet50 head → 7-class flat prediction
          → Grad-CAM on model.layer4[-1]
"""

from __future__ import annotations

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")

# ── Flat label map ────────────────────────────────────────────────────────────
# Order matches training-time label_mapping: AK=0 BCC=1 BKL=2 DF=3 MEL=4 NV=5 VASC=6
ALL_CLASSES: list[str] = ["AK", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]
NUM_CLASSES = len(ALL_CLASSES)

# ── Model weights ─────────────────────────────────────────────────────────────
MODEL_WEIGHTS = os.environ.get(
    "MODEL_WEIGHTS", os.path.join(_WEIGHTS_DIR, "best_resnet50.pth")
)
MODEL_NAME = "ResNet50"
MODEL_ARCH = "resnet50"

# ── Image preprocessing ───────────────────────────────────────────────────────
# Native ResNet50 resolution (torchvision); training used Resize(224, BILINEAR)
# + ImageNet normalize — byte-for-byte the EfficientNet-B4 pipeline besides size.
IMG_SIZE = int(os.environ.get("IMG_SIZE", "224"))
# torchvision transforms.Resize default interpolation is BILINEAR — matches
# the ResNet50 training pipeline (B4 used BICUBIC to match its own notebook).
RESIZE_INTERPOLATION = os.environ.get("RESIZE_INTERPOLATION", "BILINEAR")
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

# ── Human-friendly display labels ─────────────────────────────────────────────
LABEL_DISPLAY: dict[str, str] = {
    "AK":   "Actinic Keratosis",
    "BCC":  "Basal Cell Carcinoma",
    "BKL":  "Benign Keratosis",
    "DF":   "Dermatofibroma",
    "MEL":  "Melanoma",
    "NV":   "Melanocytic Nevus",
    "VASC": "Vascular Lesion",
}

# ── Triage severity ───────────────────────────────────────────────────────────
SEVERITY: dict[str, str] = {
    "MEL":  "urgent",
    "BCC":  "urgent",
    "AK":   "check",
    "VASC": "check",
    "BKL":  "stable",
    "DF":   "stable",
    "NV":   "stable",
}

MALIGNANT_LABELS: set[str] = {"MEL", "BCC"}

# ── Inference settings ────────────────────────────────────────────────────────
LESION_CROP_PADDING: float = float(os.environ.get("LESION_CROP_PADDING", "0.12"))

INFERENCE_TTA = os.environ.get("INFERENCE_TTA", "1").strip().lower() in {
    "1", "true", "yes", "on",
}

INFERENCE_TEMPERATURE = float(os.environ.get("INFERENCE_TEMPERATURE", "1.0"))
LOW_CONFIDENCE_THRESHOLD = float(os.environ.get("LOW_CONFIDENCE_THRESHOLD", "0.45"))
LOW_CONFIDENCE_MESSAGE = (
    "Low confidence — consider retaking the photo or consulting a dermatologist."
)

# ── Infrastructure ────────────────────────────────────────────────────────────
MONGO_URI     = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME       = os.environ.get("DB_NAME", "skinsense")
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads"))

BLUR_THRESHOLD      = float(os.environ.get("BLUR_THRESHOLD", "20.0"))
LOW_LIGHT_THRESHOLD = float(os.environ.get("LOW_LIGHT_THRESHOLD", "10.0"))

DEBUG_INFERENCE = os.environ.get("DEBUG_INFERENCE", "0").strip().lower() in {
    "1", "true", "yes", "on",
}
INFERENCE_DEBUG_DIR = os.environ.get(
    "INFERENCE_DEBUG_DIR", os.path.join(BASE_DIR, "debug_inference")
)

YOLO_MODEL_PATH    = os.environ.get("YOLO_MODEL_PATH", os.path.join(BASE_DIR, "best.pt"))
YOLO_CONF_THRESHOLD = float(os.environ.get("YOLO_CONF_THRESHOLD", "0.25"))
YOLO_STRICT_ARCH   = os.environ.get("YOLO_STRICT_ARCH", "0").strip().lower() in (
    "1", "true", "yes", "on",
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_display(label: str) -> str:
    return LABEL_DISPLAY.get(label, label or "")


def get_severity(label: str) -> str:
    return SEVERITY.get((label or "").strip(), "check")


# Back-compat alias.
CLASS_NAMES = list(ALL_CLASSES)
