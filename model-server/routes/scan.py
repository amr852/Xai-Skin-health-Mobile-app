"""Multi-lesion scan API."""

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

scan_bp = Blueprint("scan", __name__)

# Hard cap on inbound long-side for /detect-fast. Mobile sends ~320px frames;
# anything larger means the client is misconfigured and would blow the bandwidth
# budget (spec target <60 KB/frame).
DETECT_FAST_MAX_SIDE = 512


@scan_bp.route("/scan-multi", methods=["POST"])
def scan_multi():
    if "image" not in request.files:
        return jsonify({"error": "Missing image file"}), 400

    user_id = request.form.get("userId")
    source = (request.form.get("source") or "camera").strip().lower()
    file = request.files["image"]

    try:
        if source == "gallery":
            full_pil = load_upload_as_pil_no_enhance(file)
            quality_metadata: dict = {"enhancements_applied": [], "source": "gallery"}
        else:
            id_prefix = user_id if user_id else "anon"
            saved = save_enhanced_pair_from_upload(file, id_prefix)
            full_pil = saved["img_pil"]
            quality_metadata = {
                "enhancements_applied": saved["enhancements_applied"],
                "source": "camera",
            }
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    full_bgr = cv2.cvtColor(np.array(full_pil.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = full_bgr.shape[:2]

    try:
        boxes = lesion_detector.detect(full_bgr)
    except Exception:
        return jsonify({"error": "detection_failed"}), 500

    if not boxes:
        return jsonify(
            {
                "session_id": None,
                "lesion_count": 0,
                "no_lesion_found": True,
                "partial_failure": False,
                "annotated_image_b64": None,
                "lesions": [],
            }
        ), 200

    boxes = dedupe_nested_boxes(boxes)

    canvas = full_bgr.copy()
    lesions_out: list[dict] = []
    partial_failure = False

    for box in boxes:
        x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
        x1 = int(max(0, min(x1, w - 1)))
        x2 = int(max(0, min(x2, w)))
        y1 = int(max(0, min(y1, h - 1)))
        y2 = int(max(0, min(y2, h)))
        if x2 <= x1 or y2 <= y1:
            partial_failure = True
            continue

        # Crop = exact YOLO bbox, resized to model input. Matches notebook
        # val_tf (Resize((224,224)) on a PIL image) — no padding, no hair
        # removal, no post-hoc transforms.
        raw_crop = full_pil.crop((x1, y1, x2, y2))
        crop_pil = raw_crop.resize(
            (config.IMG_SIZE, config.IMG_SIZE), PILImage.LANCZOS
        )
        try:
            diag = lesion_classifier.predict(crop_pil)
        except Exception:
            partial_failure = True
            continue

        print(
            f"[/scan-multi] bbox=({x1},{y1},{x2},{y2}) "
            f"primary={diag['primary']['label']}({diag['primary']['score']:.3f}) -> "
            f"{diag['specialist_model_key']} -> "
            f"{diag['specialist']['label']}({diag['specialist']['score']:.3f}) "
            f"top_k={diag['specialist']['top_k']} "
            f"normalize={config.NORMALIZE_INPUT}"
        )

        lesion_id = str(uuid.uuid4())
        overlay_b64 = gradcam_explainer.overlay_for_lesion(crop_pil, diag)
        crop_b64 = pil_to_png_b64(crop_pil)

        bbox_payload = {
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "conf": box["conf"],
        }
        severity = config.get_severity(diag["specialist"]["label"])
        diagnosis_payload = {
            "label": diag["specialist"]["label"],
            "display": diag["specialist"].get("display"),
            "score": diag["specialist"]["score"],
            "top_k": diag["specialist"]["top_k"],
        }
        lesions_out.append(
            {
                "lesion_id": lesion_id,
                "bbox": bbox_payload,
                "primary": diag["primary"],
                "specialist": diag["specialist"],
                "diagnosis": diagnosis_payload,
                "severity": severity,
                "crop_b64": crop_b64,
                "overlay_b64": overlay_b64,
            }
        )

        try:
            paint_lesion_on_canvas(canvas, x1, y1, x2, y2, crop_pil, diag)
        except Exception:
            pass

    if not lesions_out:
        return jsonify(
            {
                "session_id": None,
                "lesion_count": 0,
                "no_lesion_found": False,
                "partial_failure": True,
                "annotated_image_b64": None,
                "quality_metadata": quality_metadata,
                "lesions": [],
            }
        ), 200

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
        }
        insert_result = scan_col.insert_one(doc)
        session_id = str(insert_result.inserted_id)

    return jsonify(
        {
            "session_id": session_id,
            "lesion_count": len(lesions_out),
            "no_lesion_found": False,
            "partial_failure": partial_failure,
            "annotated_image_b64": annotated_image_b64,
            "quality_metadata": quality_metadata,
            "lesions": lesions_out,
        }
    ), 200


@scan_bp.route("/detect-fast", methods=["POST"])
def detect_fast():
    """Detector-only fast path for the mobile Live mode.

    Reuses the module-level ``lesion_detector`` singleton (no per-request
    reload). No classifier, no Grad-CAM, no DB write, no disk I/O — frame in,
    boxes out.
    """
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
            {
                "error": f"Frame too large ({long_side}px); cap is {DETECT_FAST_MAX_SIDE}px"
            }
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

    return jsonify(
        {
            "boxes": out_boxes,
            "width": w,
            "height": h,
            "ms": round(ms, 2),
        }
    ), 200
