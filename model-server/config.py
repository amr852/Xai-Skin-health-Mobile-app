"""Environment-driven configuration for the model server.

Hierarchical EfficientNet-B0 pipeline:
  YOLO crop -> primary (benign|malignant) -> specialist (5 benign / 2 malignant)
  Grad-CAM runs on whichever specialist fired.
"""

from __future__ import annotations

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _parse_list_env(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return list(default)
    parsed = [x.strip() for x in raw.split(",") if x.strip()]
    return parsed or list(default)


PRIMARY_CLASSES = _parse_list_env("PRIMARY_CLASSES", ["benign", "malignant"])
BENIGN_CLASSES = _parse_list_env(
    "BENIGN_CLASSES", ["akiec", "bkl", "df", "nv", "vasc"]
)
# Order MUST match training-time sorted(df['dx'].unique()) for the malignant
# subset: ['bcc','mel']. Checkpoints carry no embedded labels, so logit index
# 0 = 'bcc', 1 = 'mel'. Mismatching this swaps every malignant prediction.
MALIGNANT_CLASSES = _parse_list_env(
    "MALIGNANT_CLASSES", ["bcc", "mel"]
)

LABEL_DISPLAY: dict[str, str] = {
    "benign": "Benign",
    "malignant": "Malignant",
    "akiec": "Actinic Keratosis",
    "bkl": "Benign Keratosis",
    "df": "Dermatofibroma",
    "nv": "Melanocytic Nevus",
    "vasc": "Vascular Lesion",
    "mel": "Melanoma",
    "bcc": "Basal Cell Carcinoma",
    # Legacy aliases (kept so stored sessions render).
    "melanoma": "Melanoma",
    "basal_cell_carcinoma": "Basal Cell Carcinoma",
}

# Specialist label -> triage tier surfaced in the mobile UI.
SEVERITY: dict[str, str] = {
    "mel": "urgent",
    "bcc": "urgent",
    "melanoma": "urgent",
    "basal_cell_carcinoma": "urgent",
    "akiec": "check",
    "vasc": "check",
    "bkl": "stable",
    "df": "stable",
    "nv": "stable",
}

IMG_SIZE = int(os.environ.get("IMG_SIZE", "224"))

_EFFNET_DIR_DEFAULT = r"C:\Users\admin\Desktop\Effnetb1"
PRIMARY_WEIGHTS = os.environ.get(
    "PRIMARY_WEIGHTS",
    os.path.join(_EFFNET_DIR_DEFAULT, "primary_effnet_b0_best (2).pth"),
)
BENIGN_WEIGHTS = os.environ.get(
    "BENIGN_WEIGHTS",
    os.path.join(_EFFNET_DIR_DEFAULT, "benign_effnet_b0_best (2).pth"),
)
MALIGNANT_WEIGHTS = os.environ.get(
    "MALIGNANT_WEIGHTS",
    os.path.join(_EFFNET_DIR_DEFAULT, "malignant_effnet_b0_best (2).pth"),
)

MODEL_NAME = "effnet_b0_hierarchical"

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "skinsense")
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads"))

BLUR_THRESHOLD = float(os.environ.get("BLUR_THRESHOLD", "20.0"))
LOW_LIGHT_THRESHOLD = float(os.environ.get("LOW_LIGHT_THRESHOLD", "10.0"))

# EfficientNet-B0 was trained with ImageNet normalization; keep it on by default.
NORMALIZE_INPUT = os.environ.get("NORMALIZE_INPUT", "1").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

# 4-flip Test-Time Augmentation at inference (matches notebook Cell 13
# tta_forward). Averages logits over {orig, h-flip, v-flip, hv-flip}. Set to 0
# to disable.
INFERENCE_TTA = os.environ.get("INFERENCE_TTA", "1").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", os.path.join(BASE_DIR, "best.pt"))
YOLO_CONF_THRESHOLD = float(os.environ.get("YOLO_CONF_THRESHOLD", "0.25"))
YOLO_STRICT_ARCH = os.environ.get("YOLO_STRICT_ARCH", "0").strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def get_display(label: str) -> str:
    return LABEL_DISPLAY.get((label or "").strip().lower(), label or "")


def get_severity(label: str) -> str:
    """Map specialist label to triage tier (urgent / check / stable)."""
    key = (label or "").strip().lower()
    if key in SEVERITY:
        return SEVERITY[key]
    # Unknown specialist label -> conservative default.
    return "check"


# Back-compat aliases (tests / legacy callers).
CLASS_NAMES = list(BENIGN_CLASSES) + list(MALIGNANT_CLASSES)
NUM_CLASSES = len(CLASS_NAMES)
