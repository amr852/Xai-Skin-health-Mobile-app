"""Multi-lesion scan API — MobileNetV2 7-class HAM10000 classifier.

Pipeline per request:
  1. Load + (optionally enhance) uploaded image.
  2. Whole-image classification + Grad-CAM.
  3. YOLO detection → per-lesion crop classification + Grad-CAM.
  4. If no lesions detected → healthy response.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

import cv2
import numpy as np
from flask import Blueprint, current_app, jsonify, request
from PIL import Image as PILImage

import config
from helpers import (
    load_upload_as_pil_no_enhance,
    save_enhanced_pair_from_upload,
    save_image,
    to_base64,
)
from services.classifier import lesion_classifier
from services.detector import lesion_detector
from services.explainer import gradcam_explainer, paint_lesion_on_canvas, pil_to_png_b64
from services.bbox_dedupe import dedupe_nested_boxes
from services.lesion_crop import center_fallback_crop, padded_bbox_crop

scan_bp = Blueprint("scan", __name__)

DETECT_FAST_MAX_SIDE = 512


def _display_thumbnail(display_pil: PILImage.Image, x1: int, y1: int, x2: int, y2: int) -> PILImage.Image:
    return display_pil.crop((x1, y1, x2, y2))


def _classify(pil: PILImage.Image, tag: str) -> dict:
    return lesion_classifier.predict(pil, tag=tag)


def _healthy_response(quality_metadata: dict) -> dict:
    """Response when no skin lesions are detected."""
    return {
        "session_id": None,
        "lesion_count": 0,
        "no_lesion_found": True,
        "healthy": True,
        "healthy_message": "No lesions detected — your skin looks healthy!",
        "partial_failure": False,
        "annotated_image_b64": None,
        "quality_metadata": quality_metadata,
        "whole_image": None,
        "lesions": [],
    }


@scan_bp.route("/scan-multi", methods=["POST"])
def scan_multi():
    if "image" not in request.files:
        return jsonify({"error": "Missing image file"}), 400

    user_id = request.form.get("userId")
    source = (request.form.get("source") or "camera").strip().lower()
    file = request.files["image"]

    try:
        if source == "gallery":
            raw_pil = load_upload_as_pil_no_enhance(file)
            display_pil = raw_pil
            quality_metadata: dict = {"enhancements_applied": [], "source": "gallery"}
        else:
            id_prefix = user_id if user_id else "anon"
            try:
                file.stream.seek(0)
            except Exception:
                pass
            raw_pil = load_upload_as_pil_no_enhance(file)
            try:
                file.stream.seek(0)
            except Exception:
                pass
            saved = save_enhanced_pair_from_upload(file, id_prefix)
            display_pil = saved["img_pil"]
            quality_metadata = {
                "enhancements_applied": saved["enhancements_applied"],
                "source": "camera",
            }
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # ── YOLO detection ────────────────────────────────────────────────────────
    full_bgr = cv2.cvtColor(np.array(display_pil.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = full_bgr.shape[:2]
    raw_w, raw_h = raw_pil.size
    sx = raw_w / float(w) if w > 0 else 1.0
    sy = raw_h / float(h) if h > 0 else 1.0

    try:
        boxes = lesion_detector.detect(full_bgr)
    except Exception:
        boxes = []

    if not boxes:
        # No lesions detected — skip classification and return healthy response.
        return jsonify(_healthy_response(quality_metadata)), 200

    boxes = dedupe_nested_boxes(boxes)

    # ── Whole-image classification + Grad-CAM ─────────────────────────────────
    try:
        whole_diag = _classify(raw_pil, tag="whole_image")
    except Exception:
        return jsonify({"error": "classification_failed"}), 500

    whole_overlay_b64 = gradcam_explainer.overlay_for_lesion(
        raw_pil, whole_diag, tag="whole_image"
    )

    whole_severity = config.get_severity(whole_diag["specialist"]["label"])
    whole_image_payload = {
        "primary": whole_diag["primary"],
        "specialist": whole_diag["specialist"],
        "diagnosis": {
            "label": whole_diag["specialist"]["label"],
            "display": whole_diag["specialist"].get("display"),
            "score": whole_diag["specialist"]["score"],
            "top_k": whole_diag["specialist"]["top_k"],
        },
        "severity": whole_severity,
        "overlay_b64": whole_overlay_b64,
        "uncertainty": whole_diag.get("uncertainty"),
    }

    print(
        f"[/scan-multi] whole_image: {whole_diag['specialist']['label']}"
        f"({whole_diag['specialist']['score']:.3f}) severity={whole_severity}"
    )

    # ── Per-lesion classification + Grad-CAM ──────────────────────────────────
    canvas = full_bgr.copy()
    lesions_out: list[dict] = []
    partial_failure = False

    for idx, box in enumerate(boxes):
        x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
        x1 = int(max(0, min(x1, w - 1)))
        x2 = int(max(0, min(x2, w)))
        y1 = int(max(0, min(y1, h - 1)))
        y2 = int(max(0, min(y2, h)))
        if x2 <= x1 or y2 <= y1:
            partial_failure = True
            continue

        display_crop = _display_thumbnail(display_pil, x1, y1, x2, y2)

        rx1 = int(max(0, min(x1 * sx, raw_w - 1)))
        rx2 = int(max(0, min(x2 * sx, raw_w)))
        ry1 = int(max(0, min(y1 * sy, raw_h - 1)))
        ry2 = int(max(0, min(y2 * sy, raw_h)))
        if rx2 <= rx1 or ry2 <= ry1:
            rx1, ry1, rx2, ry2 = 0, 0, raw_w, raw_h

        raw_crop = padded_bbox_crop(raw_pil, rx1, ry1, rx2, ry2)

        tag = f"lesion_{idx}"
        try:
            diag = _classify(raw_crop, tag=tag)
        except Exception:
            partial_failure = True
            continue

        lesion_id = str(uuid.uuid4())
        try:
            overlay_b64 = gradcam_explainer.overlay_for_lesion(raw_crop, diag, tag=tag)
        except Exception:
            overlay_b64 = None
            partial_failure = True

        crop_b64 = pil_to_png_b64(display_crop)
        lesion_severity = config.get_severity(diag["specialist"]["label"])

        lesion_doc = {
            "lesion_id": lesion_id,
            "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": box["conf"]},
            "primary": diag["primary"],
            "specialist": diag["specialist"],
            "diagnosis": {
                "label": diag["specialist"]["label"],
                "display": diag["specialist"].get("display"),
                "score": diag["specialist"]["score"],
                "top_k": diag["specialist"]["top_k"],
            },
            "severity": lesion_severity,
            "uncertainty": diag.get("uncertainty"),
            "crop_b64": crop_b64,
            "overlay_b64": overlay_b64,
        }
        lesions_out.append(lesion_doc)

        try:
            paint_lesion_on_canvas(canvas, x1, y1, x2, y2, raw_crop, diag)
        except Exception:
            pass

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    ann_name = f"annot_multi_{timestamp}.png"
    ann_path = save_image(canvas, ann_name)
    annotated_image_b64 = to_base64(ann_path)

    session_id = None
    if user_id:
        scan_col = current_app.config["SCAN_SESSIONS_COL"]
        doc = {
            "userId": user_id,
            "created_at": datetime.now(timezone.utc),
            "lesion_count": len(lesions_out),
            "lesions": [
                {
                    "lesion_id": x["lesion_id"],
                    "bbox": x["bbox"],
                    "primary": x["primary"],
                    "specialist": x["specialist"],
                    "diagnosis": x["diagnosis"],
                    "severity": x["severity"],
                }
                for x in lesions_out
            ],
            "quality_metadata": quality_metadata,
            "annotated_image_name": ann_name,
            "whole_image": {
                "primary": whole_image_payload["primary"],
                "specialist": whole_image_payload["specialist"],
                "diagnosis": whole_image_payload["diagnosis"],
                "severity": whole_image_payload["severity"],
            },
        }
        insert_result = scan_col.insert_one(doc)
        session_id = str(insert_result.inserted_id)

    return jsonify(
        {
            "session_id": session_id,
            "lesion_count": len(lesions_out),
            "no_lesion_found": len(lesions_out) == 0,
            "healthy": len(lesions_out) == 0,
            "healthy_message": "No lesions detected — your skin looks healthy!" if len(lesions_out) == 0 else None,
            "partial_failure": partial_failure,
            "annotated_image_b64": annotated_image_b64,
            "quality_metadata": quality_metadata,
            "whole_image": whole_image_payload,
            "lesions": lesions_out,
        }
    ), 200


@scan_bp.route("/detect-fast", methods=["POST"])
def detect_fast():
    """Detector-only fast path for the mobile Live mode (reticle crop)."""
    if "image" not in request.files:
        return jsonify({"error": "Missing image file"}), 400

    file = request.files["image"]
    raw = file.read()
    if not raw:
        return jsonify({"error": "Empty image"}), 400

    arr = np.frombuffer(raw, dtype=np.uint8)
    image_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        return jsonify({"error": "Could not decode image"}), 400

    h, w = image_bgr.shape[:2]
    long_side = max(h, w)
    if long_side > DETECT_FAST_MAX_SIDE:
        return jsonify(
            {"error": f"Frame too large ({long_side}px); cap is {DETECT_FAST_MAX_SIDE}px"}
        ), 413

    started = time.perf_counter()
    try:
        boxes = lesion_detector.detect(image_bgr)
    except Exception:
        return jsonify({"error": "detection_failed"}), 500

    boxes = dedupe_nested_boxes(boxes)

    inv_w = 1.0 / w if w > 0 else 0.0
    inv_h = 1.0 / h if h > 0 else 0.0
    out_boxes: list[dict] = []
    for box in boxes:
        x1 = max(0, min(int(box["x1"]), w))
        y1 = max(0, min(int(box["y1"]), h))
        x2 = max(0, min(int(box["x2"]), w))
        y2 = max(0, min(int(box["y2"]), h))
        if x2 <= x1 or y2 <= y1:
            continue
        out_boxes.append(
            {
                "x": x1 * inv_w,
                "y": y1 * inv_h,
                "w": (x2 - x1) * inv_w,
                "h": (y2 - y1) * inv_h,
                "cls": box.get("cls", "lesion"),
                "conf": float(box.get("conf", 0.0)),
            }
        )

    ms = (time.perf_counter() - started) * 1000.0

    return jsonify({"boxes": out_boxes, "width": w, "height": h, "ms": round(ms, 2)}), 200
