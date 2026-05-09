"""Environment-driven configuration for the model server."""

from __future__ import annotations

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CLASS_NAMES = [
    "Acne",
    "Eczema",
    "Actinic Keratoses",
    "Basal cell carcinoma",
    "benign keratosis-like lesions",
    "chickenpox",
    "dermatofibroma",
    "healthy",
    "hfmd",
    "melanocytic nevi",
    "melanoma",
    "monkeypox",
    "squamous cell carcinoma",
    "Vascular lesions",
]

_class_names_from_env = os.environ.get("CLASS_NAMES", "").strip()
if _class_names_from_env:
    parsed_names = [x.strip() for x in _class_names_from_env.split(",") if x.strip()]
    if parsed_names:
        CLASS_NAMES = parsed_names

NUM_CLASSES = len(CLASS_NAMES)
IMG_SIZE = int(os.environ.get("IMG_SIZE", "224"))
MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(BASE_DIR, "resnet50_best.pth"))
MODEL_NAME = os.path.splitext(os.path.basename(MODEL_PATH))[0]
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "skinsense")
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads"))

BLUR_THRESHOLD = float(os.environ.get("BLUR_THRESHOLD", "40.0"))
LOW_LIGHT_THRESHOLD = float(os.environ.get("LOW_LIGHT_THRESHOLD", "20.0"))

NORMALIZE_INPUT = os.environ.get("NORMALIZE_INPUT", "0").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

# Default weights file: place your **YOLOv12 nano** training `best.pt` here (Ultralytics `yolo12n.pt` family).
# Override path with YOLO_MODEL_PATH; set YOLO_STRICT_ARCH=1 to abort if checkpoint is not yolo12n.
YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", os.path.join(BASE_DIR, "best.pt"))
YOLO_CONF_THRESHOLD = float(os.environ.get("YOLO_CONF_THRESHOLD", "0.25"))
YOLO_STRICT_ARCH = os.environ.get("YOLO_STRICT_ARCH", "0").strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Severity buckets (case-insensitive match on predicted label)
_URGENT = {
    "melanoma",
    "basal cell carcinoma",
    "squamous cell carcinoma",
    "actinic keratoses",
}
_CHECK = {
    "eczema",
    "acne",
    "hfmd",
    "monkeypox",
    "vascular lesions",
    "dermatofibroma",
    "chickenpox",
}
_STABLE = {
    "healthy",
    "melanocytic nevi",
    "benign keratosis-like lesions",
}


def get_severity(label: str) -> str:
    """Map classifier label to urgency tier from the approved spec."""
    key = (label or "").strip().lower()
    if key in _URGENT:
        return "urgent"
    if key in _CHECK:
        return "check"
    if key in _STABLE:
        return "stable"
    return "check"
