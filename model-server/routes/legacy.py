"""Original single-lesion API routes (preserved for backwards compatibility)."""

from __future__ import annotations

import os
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request

import config
from helpers import load_pil, save_enhanced_pair_from_upload, save_image, to_base64
from services.classifier import lesion_classifier
from services.explainer import gradcam_explainer


def _predict_pil(img_pil):
    result = lesion_classifier.predict(img_pil)
    return {
        "pred_idx": result["pred_idx"],
        "class_name": result["specialist"]["label"],
        "score": result["specialist"]["score"],
        "top_preds": result["specialist"]["top_k"],
    }


def _legacy_cam(img_pil, classifier_result: dict):
    """Return Grad-CAM as a BGR numpy array for the legacy /scan and /predict-xai routes."""
    import base64
    import cv2
    import numpy as np

    b64 = gradcam_explainer.overlay_for_lesion(img_pil, classifier_result, tag="legacy")
    if b64 is None:
        return None
    buf = np.frombuffer(base64.b64decode(b64), dtype=np.uint8)
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


legacy_bp = Blueprint("legacy", __name__)


@legacy_bp.route("/", methods=["GET"])
def home():
    from services import detector as yolo_detector

    return jsonify(
        {
            "status": "Skin Lesion Classifier API is running",
            "model_name": config.MODEL_NAME,
            "model_path": config.MODEL_WEIGHTS,
            "num_classes": config.NUM_CLASSES,
            "yolo_model_path": yolo_detector.DETECTOR_WEIGHTS_PATH
            or config.YOLO_MODEL_PATH,
            "yolo_train_base": yolo_detector.DETECTOR_TRAIN_BASE,
            "quality_thresholds": {
                "blur_threshold": config.BLUR_THRESHOLD,
                "low_light_threshold": config.LOW_LIGHT_THRESHOLD,
            },
        }
    )


@legacy_bp.route("/analyze", methods=["POST"])
def analyze_image():
    if "image" not in request.files:
        return jsonify({"error": "Missing image file"}), 400

    user_id = request.form.get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    file = request.files["image"]
    results_col = current_app.config["RESULTS_COL"]

    try:
        saved = save_enhanced_pair_from_upload(file, user_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    record = {
        "userId": user_id,
        "original_image_name": saved["original_image_name"],
        "enhanced_image_name": saved["enhanced_image_name"],
        "enhancements_applied": saved["enhancements_applied"],
        "quality_before": saved["quality_before"],
        "quality_after": saved["quality_after"],
        "quality_thresholds": saved["quality_thresholds"],
        "prediction": None,
        "cam_image_name": None,
        "xai_method": None,
        "created_at": datetime.now(timezone.utc),
    }
    insert_result = results_col.insert_one(record)

    return jsonify(
        {
            "status": "Image processed and enhanced",
            "record_id": str(insert_result.inserted_id),
            "original_image_name": saved["original_image_name"],
            "enhanced_image_name": saved["enhanced_image_name"],
            "enhancements_applied": saved["enhancements_applied"],
            "quality_before": saved["quality_before"],
            "quality_after": saved["quality_after"],
            "quality_thresholds": saved["quality_thresholds"],
            "userId": user_id,
            "model_name": config.MODEL_NAME,
        }
    ), 200


@legacy_bp.route("/scan", methods=["POST"])
def scan_lesion():
    if "image" not in request.files:
        return jsonify({"error": "Missing image file"}), 400

    user_id = request.form.get("userId")
    id_prefix = user_id if user_id else "anon"
    file = request.files["image"]
    results_col = current_app.config["RESULTS_COL"]

    try:
        saved = save_enhanced_pair_from_upload(file, id_prefix)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    img_pil = saved["img_pil"]
    full_result = lesion_classifier.predict(img_pil)
    pred = {
        "pred_idx": full_result["pred_idx"],
        "class_name": full_result["specialist"]["label"],
        "score": full_result["specialist"]["score"],
        "top_preds": full_result["specialist"]["top_k"],
    }
    pred_idx = pred["pred_idx"]
    class_name = pred["class_name"]
    pred_score = pred["score"]
    top_preds = pred["top_preds"]
    print(f"[/scan] effnetb4: {class_name} (idx={pred_idx}, score={pred_score:.4f})")

    cam_name = None
    cam_b64 = None
    try:
        overlay_bgr = _legacy_cam(img_pil, full_result)
        base = os.path.splitext(saved["enhanced_image_name"])[0]
        cam_name = f"cam_{base}.png"
        cam_path = save_image(overlay_bgr, cam_name)
        cam_b64 = to_base64(cam_path)
    except Exception as e:
        print("Grad-CAM failed (returning prediction without CAM):", e)

    record_id = None
    if user_id:
        record = {
            "userId": user_id,
            "original_image_name": saved["original_image_name"],
            "enhanced_image_name": saved["enhanced_image_name"],
            "enhancements_applied": saved["enhancements_applied"],
            "quality_before": saved["quality_before"],
            "quality_after": saved["quality_after"],
            "quality_thresholds": saved["quality_thresholds"],
            "prediction": class_name,
            "cam_image_name": cam_name,
            "xai_method": "Grad-CAM",
            "created_at": datetime.now(timezone.utc),
        }
        insert_result = results_col.insert_one(record)
        record_id = str(insert_result.inserted_id)

    return jsonify(
        {
            "prediction": class_name,
            "prediction_index": pred_idx,
            "score": pred_score,
            "top_predictions": top_preds,
            "enhancements_applied": saved["enhancements_applied"],
            "quality_before": saved["quality_before"],
            "quality_after": saved["quality_after"],
            "quality_thresholds": saved["quality_thresholds"],
            "xai_method": "Grad-CAM",
            "model_name": config.MODEL_NAME,
            "cam_base64": cam_b64,
            "cam_image_name": cam_name,
            "record_id": record_id,
            "enhanced_image_name": saved["enhanced_image_name"],
        }
    ), 200


@legacy_bp.route("/images/<user_id>", methods=["GET"])
def get_images_by_user(user_id):
    results_col = current_app.config["RESULTS_COL"]
    try:
        docs = results_col.find({"userId": user_id})
        images = [
            {
                "record_id": str(doc["_id"]),
                "original_image_name": doc.get("original_image_name"),
                "enhanced_image_name": doc.get("enhanced_image_name"),
                "cam_image_name": doc.get("cam_image_name"),
                "prediction": doc.get("prediction"),
                "created_at": doc.get("created_at", "").isoformat()
                if doc.get("created_at")
                else None,
            }
            for doc in docs
        ]
        return jsonify({"userId": user_id, "images": images}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@legacy_bp.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    image_name = data.get("image_name") if data else None
    if not image_name:
        return jsonify({"error": "image_name is required"}), 400

    results_col = current_app.config["RESULTS_COL"]

    try:
        img_pil = load_pil(image_name)
        full_result = lesion_classifier.predict(img_pil)
        pred_idx = full_result["pred_idx"]
        class_name = full_result["specialist"]["label"]
        pred_score = full_result["specialist"]["score"]
        top_preds = full_result["specialist"]["top_k"]

        results_col.update_one(
            {"enhanced_image_name": image_name},
            {"$set": {"prediction": class_name}},
        )

        return jsonify(
            {
                "prediction_index": pred_idx,
                "prediction": class_name,
                "score": pred_score,
                "top_predictions": top_preds,
            }
        ), 200

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@legacy_bp.route("/predict-xai", methods=["POST"])
def predict_with_xai():
    data = request.get_json()
    image_name = data.get("image_name") if data else None
    if not image_name:
        return jsonify({"error": "image_name is required"}), 400

    results_col = current_app.config["RESULTS_COL"]

    try:
        img_pil = load_pil(image_name)
        full_result = lesion_classifier.predict(img_pil)
        pred_idx = full_result["pred_idx"]
        class_name = full_result["specialist"]["label"]
        pred_score = full_result["specialist"]["score"]
        top_preds = full_result["specialist"]["top_k"]

        cam_name = None
        cam_b64 = None
        try:
            overlay_bgr = _legacy_cam(img_pil, full_result)
            base = os.path.splitext(image_name)[0]
            cam_name = f"cam_{base}.png"
            cam_path = save_image(overlay_bgr, cam_name)
            cam_b64 = to_base64(cam_path)
        except Exception as cam_err:
            print("Grad-CAM failed (returning prediction without CAM):", cam_err)

        update_set = {"prediction": class_name}
        if cam_name:
            update_set["cam_image_name"] = cam_name
            update_set["xai_method"] = "Grad-CAM"
        results_col.update_one(
            {"enhanced_image_name": image_name},
            {"$set": update_set},
        )

        return jsonify(
            {
                "prediction": class_name,
                "prediction_index": pred_idx,
                "score": pred_score,
                "top_predictions": top_preds,
                "cam_image_name": cam_name,
                "cam_base64": cam_b64,
            }
        ), 200

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
