"""Original single-lesion API routes (preserved)."""

from __future__ import annotations

import os
from datetime import datetime, timezone

import torch
from flask import Blueprint, current_app, jsonify, request

import config
from helpers import load_pil, save_enhanced_pair_from_upload, save_image, to_base64
from services.classifier import CLASS_NAMES, DEVICE, model, top_k_predictions, transform
from services.explainer import compute_gradcam_heatmap, overlay_cam_on_pil

legacy_bp = Blueprint("legacy", __name__)


@legacy_bp.route("/", methods=["GET"])
def home():
    from services import detector as yolo_detector

    return jsonify(
        {
            "status": "Skin Lesion Classifier API is running",
            "device": str(DEVICE),
            "model_name": config.MODEL_NAME,
            "model_path": config.MODEL_PATH,
            "normalize_input": config.NORMALIZE_INPUT,
            "yolo_model_path": yolo_detector.DETECTOR_WEIGHTS_PATH
            or config.YOLO_MODEL_PATH,
            "yolo_train_base": yolo_detector.DETECTOR_TRAIN_BASE,
            "yolo_expected": "yolo12n (YOLOv12 nano)",
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
            "normalize_input": config.NORMALIZE_INPUT,
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
    tensor = transform(img_pil).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = model(tensor)
    pred_idx = int(logits.argmax(dim=1).item())
    probs = torch.softmax(logits, dim=1)[0]
    pred_score = float(probs[pred_idx].item())
    class_name = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else str(pred_idx)
    top_preds = top_k_predictions(logits, k=3)
    print(
        f"[/scan] model prediction: {class_name} (idx={pred_idx}, "
        f"score={pred_score:.4f}) | top3={top_preds} | "
        f"normalize_input={config.NORMALIZE_INPUT}"
    )

    cam_name = None
    cam_b64 = None
    try:
        heatmap = compute_gradcam_heatmap(tensor, pred_idx)
        overlay = overlay_cam_on_pil(img_pil, heatmap)
        base = os.path.splitext(saved["enhanced_image_name"])[0]
        cam_name = f"cam_{base}.png"
        cam_path = save_image(overlay, cam_name)
        cam_b64 = to_base64(cam_path)
    except Exception as e:
        print("Grad-CAM failed (returning prediction without CAM):", e)
        cam_name = None
        cam_b64 = None

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
            "normalize_input": config.NORMALIZE_INPUT,
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
        tensor = transform(img_pil).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            outputs = model(tensor)
            pred_idx = int(outputs.argmax(dim=1).item())
            probs = torch.softmax(outputs, dim=1)[0]
            pred_score = float(probs[pred_idx].item())
            class_name = (
                CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else str(pred_idx)
            )
        top_preds = top_k_predictions(outputs, k=3)
        print(
            f"[/predict] model prediction: {class_name} (idx={pred_idx}, "
            f"score={pred_score:.4f}) | top3={top_preds} | "
            f"normalize_input={config.NORMALIZE_INPUT}"
        )

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
        tensor = transform(img_pil).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            logits = model(tensor)
            pred_idx = int(logits.argmax(dim=1).item())
            probs = torch.softmax(logits, dim=1)[0]
            pred_score = float(probs[pred_idx].item())

        class_name = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else str(pred_idx)
        top_preds = top_k_predictions(logits, k=3)
        print(
            f"[/predict-xai] model prediction: {class_name} (idx={pred_idx}, "
            f"score={pred_score:.4f}) | top3={top_preds} | "
            f"normalize_input={config.NORMALIZE_INPUT}"
        )

        cam_name = None
        cam_b64 = None
        try:
            heatmap = compute_gradcam_heatmap(tensor, pred_idx)
            overlay = overlay_cam_on_pil(img_pil, heatmap)
            base = os.path.splitext(image_name)[0]
            cam_name = f"cam_{base}.png"
            cam_path = save_image(overlay, cam_name)
            cam_b64 = to_base64(cam_path)
        except Exception as cam_err:
            print("Grad-CAM failed (returning prediction without CAM):", cam_err)
            cam_name = None
            cam_b64 = None

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
