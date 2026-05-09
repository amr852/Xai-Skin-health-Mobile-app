"""Multi-lesion scan API."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import cv2
import numpy as np
from flask import Blueprint, current_app, jsonify, request

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

        crop_pil = full_pil.crop((x1, y1, x2, y2))
        try:
            diag = lesion_classifier.predict(crop_pil)
        except Exception:
            partial_failure = True
            continue

        lesion_id = str(uuid.uuid4())
        overlay_b64 = gradcam_explainer.overlay_for_lesion(
            crop_pil,
            diag["pred_idx"],
            diag["label"],
            diag["score"],
        )
        crop_b64 = pil_to_png_b64(crop_pil)

        bbox_payload = {
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "conf": box["conf"],
        }
        severity = config.get_severity(diag["label"])
        lesions_out.append(
            {
                "lesion_id": lesion_id,
                "bbox": bbox_payload,
                "diagnosis": {
                    "label": diag["label"],
                    "score": diag["score"],
                    "top_k": diag["top_k"],
                },
                "severity": severity,
                "crop_b64": crop_b64,
                "overlay_b64": overlay_b64,
            }
        )

        try:
            paint_lesion_on_canvas(
                canvas,
                x1,
                y1,
                x2,
                y2,
                crop_pil,
                diag["pred_idx"],
                diag["label"],
                diag["score"],
            )
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
