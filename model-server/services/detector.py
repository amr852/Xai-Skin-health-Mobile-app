"""YOLO lesion detector (YOLOv12 nano — yolo12n — weights expected)."""

from __future__ import annotations

import os

import numpy as np
from ultralytics import YOLO

import config

# Filled at startup for GET / diagnostics
DETECTOR_WEIGHTS_PATH: str | None = None
DETECTOR_TRAIN_BASE: str | None = None


def _expected_yolo12n(train_base: str) -> bool:
    b = (train_base or "").lower().strip()
    if not b:
        return False
    return "yolo12n" in b or b.endswith("12n.pt") or "yolov12n" in b


def _verify_yolo12n_checkpoint(weights_path: str, yolo: YOLO) -> None:
    """Ensure checkpoint matches YOLOv12 nano training (train_args.model)."""
    ckpt = getattr(yolo, "ckpt", None)
    ta = ckpt.get("train_args") if isinstance(ckpt, dict) else None
    train_base = ""
    if isinstance(ta, dict):
        train_base = str(ta.get("model", "") or "")

    global DETECTOR_TRAIN_BASE
    DETECTOR_TRAIN_BASE = train_base or None

    if train_base and not _expected_yolo12n(train_base):
        msg = (
            f"YOLO weights {weights_path!r} report train base {train_base!r}; "
            "this service expects Ultralytics YOLOv12 **nano** (yolo12n) weights."
        )
        if config.YOLO_STRICT_ARCH:
            raise RuntimeError(msg)
        print(f"WARNING: {msg}")
    elif train_base:
        print(
            f"  ✅ YOLOv12n detector: {os.path.basename(weights_path)} "
            f"(trained from {train_base})"
        )
    else:
        print(
            f"  ⚠️  YOLO detector: {os.path.basename(weights_path)} — "
            "could not read train_args.model; confirm this file is yolo12n best.pt"
        )


class LesionDetector:
    def __init__(
        self,
        model_path: str | None = None,
        conf_threshold: float | None = None,
    ):
        global DETECTOR_WEIGHTS_PATH
        path = os.path.abspath(model_path or config.YOLO_MODEL_PATH)
        DETECTOR_WEIGHTS_PATH = path
        if not os.path.isfile(path):
            raise FileNotFoundError(
                f"YOLO weights not found: {path}\n"
                "Copy your yolo12n training best.pt here or set YOLO_MODEL_PATH."
            )
        self.conf = float(
            config.YOLO_CONF_THRESHOLD
            if conf_threshold is None
            else conf_threshold
        )
        self.model = YOLO(path)
        _verify_yolo12n_checkpoint(path, self.model)

    def detect(self, image_bgr: np.ndarray) -> list[dict]:
        results = self.model(image_bgr, conf=self.conf, verbose=False)
        names = getattr(self.model, "names", {}) or {}
        boxes: list[dict] = []
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cls_idx = int(box.cls[0]) if getattr(box, "cls", None) is not None else 0
            cls_label = str(names.get(cls_idx, cls_idx)) if isinstance(names, dict) else str(cls_idx)
            boxes.append(
                {
                    "x1": int(x1),
                    "y1": int(y1),
                    "x2": int(x2),
                    "y2": int(y2),
                    "conf": float(box.conf[0]),
                    "cls": cls_label,
                }
            )
        return boxes


lesion_detector = LesionDetector()
