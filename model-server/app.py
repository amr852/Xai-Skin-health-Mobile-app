import io
import os
import cv2
import base64
import tempfile
import numpy as np
from PIL import Image
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import torch
import torch.nn as nn
from torchvision import models, transforms
from torchvision.models.feature_extraction import create_feature_extractor

from image_quality import (
    is_blurry, is_low_light,
    enhance_blurry_image, enhance_low_light_image
)

# ─────────────────────────────────────────────
# 🔧 Configuration
# ─────────────────────────────────────────────
CLASS_NAMES = [
    'Acne', 'Eczema', 'Actinic Keratoses', 'Basal cell carcinoma',
    'benign keratosis-like lesions', 'chickenpox', 'dermatofibroma', 'healthy',
    'hfmd', 'melanocytic nevi', 'melanoma',
    'monkeypox', 'squamous cell carcinoma', 'Vascular lesions',
]
NUM_CLASSES   = len(CLASS_NAMES)
IMG_SIZE      = int(os.environ.get('IMG_SIZE', 224))
MODEL_PATH    = os.environ.get('MODEL_PATH', 'resnet50_best.pth')
MONGO_URI     = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME       = os.environ.get('DB_NAME', 'skinsense')
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─────────────────────────────────────────────
# 🚀 Initialize Flask app
# ─────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# 🍃 MongoDB setup
# ─────────────────────────────────────────────
mongo_client      = MongoClient(MONGO_URI)
db                = mongo_client[DB_NAME]
results_col       = db['skin_analysis_results']

# ─────────────────────────────────────────────
# ⚡ Device setup
# ─────────────────────────────────────────────
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ─────────────────────────────────────────────
# 📐 Image transformation
# ─────────────────────────────────────────────
transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# ─────────────────────────────────────────────
# 🧠 Load model
# ─────────────────────────────────────────────
def load_model():
    """Load ResNet-50 from checkpoint; infer number of output classes automatically."""
    print(f"Loading model from {MODEL_PATH} …")
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)

    # Unwrap common checkpoint wrappers
    if isinstance(checkpoint, dict):
        state_dict = (checkpoint.get('model_state_dict')
                      or checkpoint.get('state_dict')
                      or checkpoint)
    else:
        state_dict = checkpoint

    # Detect output size from the final FC layer
    fc_weight = state_dict.get('fc.weight')
    num_classes = fc_weight.shape[0] if fc_weight is not None else NUM_CLASSES
    print(f"  → {num_classes} output classes detected in checkpoint")

    # ⚠️  Sync CLASS_NAMES if the checkpoint disagrees with the hard-coded list
    global CLASS_NAMES
    if num_classes != len(CLASS_NAMES):
        print(
            f"  ⚠️  CLASS_NAMES has {len(CLASS_NAMES)} entries but checkpoint "
            f"has {num_classes} outputs — falling back to numeric labels.\n"
            f"     Update CLASS_NAMES in the config section to fix this."
        )
        CLASS_NAMES = [f'class_{i}' for i in range(num_classes)]

    model = models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    model.load_state_dict(state_dict)
    model = model.to(DEVICE)
    model.eval()

    target_layer = model.layer4[-1]
    return model, target_layer


model, target_layer = load_model()
print(f"  ✅ Active CLASS_NAMES ({len(CLASS_NAMES)}): {CLASS_NAMES}")

# Feature extractor used by Grad-CAM
feature_extractor = create_feature_extractor(
    model, return_nodes={'layer4': 'features'}
)

# ─────────────────────────────────────────────
# 🛠️ Helpers
# ─────────────────────────────────────────────
def _save_image(image: np.ndarray, filename: str) -> str:
    """Write a BGR/numpy image to UPLOAD_FOLDER and return its path."""
    path = os.path.join(UPLOAD_FOLDER, filename)
    cv2.imwrite(path, image)
    return path


def _load_pil(image_name: str) -> Image.Image:
    """Load a previously saved image as a PIL RGB image."""
    path = os.path.join(UPLOAD_FOLDER, image_name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Image not found: {image_name}")
    return Image.open(path).convert('RGB')


def _to_base64(image_path: str) -> str:
    """Read an image file and return its base64 string."""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def _encode_pil(pil_image: Image.Image) -> str:
    """Encode a PIL image to a base64 PNG string."""
    buf = io.BytesIO()
    pil_image.save(buf, format='PNG')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def _gradcam(image_tensor: torch.Tensor, target_class: int) -> np.ndarray:
    """Return a normalised Grad-CAM heatmap (H×W float32 in [0, 1])."""
    image_tensor = image_tensor.clone().requires_grad_(True)

    with torch.enable_grad():
        activations = feature_extractor(image_tensor)['features']
        logits      = model(image_tensor)
        score       = logits[0, target_class]
        grads       = torch.autograd.grad(score, activations)[0]

    pooled = grads.mean(dim=(0, 2, 3))
    cam    = (activations.detach() * pooled[None, :, None, None]).mean(dim=1)
    cam    = cam.squeeze(0).cpu().numpy()
    cam    = np.maximum(cam, 0)
    if cam.max() > 0:
        cam /= cam.max()
    return cam.astype(np.float32)


def _overlay_cam(original_pil: Image.Image, heatmap: np.ndarray) -> np.ndarray:
    """Blend a Grad-CAM heatmap over the original image (BGR numpy array)."""
    h, w   = original_pil.height, original_pil.width
    cam_u8 = cv2.resize((heatmap * 255).astype(np.uint8), (w, h))
    heat   = cv2.applyColorMap(cam_u8, cv2.COLORMAP_JET)
    orig   = cv2.cvtColor(np.array(original_pil), cv2.COLOR_RGB2BGR)
    return cv2.addWeighted(orig, 0.6, heat, 0.4, 0)


def _serialize_doc(doc: dict) -> dict:
    """Convert MongoDB ObjectId to string for JSON serialisation."""
    doc['_id'] = str(doc['_id'])
    return doc


# ─────────────────────────────────────────────
# 📸 Analyze image quality & enhance
# ─────────────────────────────────────────────
@app.route('/analyze', methods=['POST'])
def analyze_image():
    """
    Accepts a multipart image upload.
    Checks blur / low-light quality, enhances if needed, persists to disk,
    and creates a MongoDB record keyed to the user.

    Form fields:
      image  — the image file
      userId — the user identifier
    """
    if 'image' not in request.files:
        return jsonify({'error': 'Missing image file'}), 400

    user_id = request.form.get('userId')
    if not user_id:
        return jsonify({'error': 'userId is required'}), 400

    file = request.files['image']
    ext  = os.path.splitext(file.filename)[1] or '.jpg'

    # ── Save original to a temp file for quality checks ──────────────────
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        image = cv2.imread(tmp_path)
        if image is None:
            return jsonify({'error': 'Could not read image'}), 400

        # 🔍 Quality checks & enhancement
        enhancements_applied = []

        if is_blurry(tmp_path):
            print("Image is blurry – enhancing …")
            image = enhance_blurry_image(image)
            enhancements_applied.append('sharpening')

        if is_low_light(tmp_path):
            print("Image is too dark – enhancing …")
            image = enhance_low_light_image(image)
            enhancements_applied.append('brightness')

        # ── Persist both copies ──────────────────────────────────────────
        timestamp       = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')
        original_name   = f"orig_{user_id}_{timestamp}{ext}"
        enhanced_name   = f"enh_{user_id}_{timestamp}{ext}"

        cv2.imwrite(os.path.join(UPLOAD_FOLDER, original_name),
                    cv2.imread(tmp_path))          # save untouched original
        cv2.imwrite(os.path.join(UPLOAD_FOLDER, enhanced_name), image)

        # ── MongoDB record ───────────────────────────────────────────────
        record = {
            'userId':               user_id,
            'original_image_name':  original_name,
            'enhanced_image_name':  enhanced_name,
            'enhancements_applied': enhancements_applied,
            'prediction':           None,
            'cam_image_name':       None,
            'created_at':           datetime.now(timezone.utc),
        }
        insert_result = results_col.insert_one(record)

        return jsonify({
            'status':               'Image processed and enhanced',
            'record_id':            str(insert_result.inserted_id),
            'original_image_name':  original_name,
            'enhanced_image_name':  enhanced_name,
            'enhancements_applied': enhancements_applied,
            'userId':               user_id,
        }), 200

    finally:
        os.unlink(tmp_path)


# ─────────────────────────────────────────────
# 🖼️ Get images by user ID
# ─────────────────────────────────────────────
@app.route('/images/<user_id>', methods=['GET'])
def get_images_by_user(user_id):
    """Return all analysis records for a given user."""
    try:
        docs   = results_col.find({'userId': user_id})
        images = [
            {
                'record_id':            str(doc['_id']),
                'original_image_name':  doc.get('original_image_name'),
                'enhanced_image_name':  doc.get('enhanced_image_name'),
                'cam_image_name':       doc.get('cam_image_name'),
                'prediction':           doc.get('prediction'),
                'created_at':           doc.get('created_at', '').isoformat()
                                        if doc.get('created_at') else None,
            }
            for doc in docs
        ]
        return jsonify({'userId': user_id, 'images': images}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────
# 🔍 Predict class (no XAI)
# ─────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    """
    Runs a quick prediction on an already-uploaded enhanced image.

    JSON body:
      image_name — filename returned by /analyze (enhanced_image_name)
    """
    data       = request.get_json()
    image_name = data.get('image_name') if data else None
    if not image_name:
        return jsonify({'error': 'image_name is required'}), 400

    try:
        img_pil = _load_pil(image_name)
        tensor  = transform(img_pil).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            outputs   = model(tensor)
            pred_idx  = outputs.argmax(dim=1).item()
            class_name = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else str(pred_idx)

        # Update matching MongoDB record
        results_col.update_one(
            {'enhanced_image_name': image_name},
            {'$set': {'prediction': class_name}},
        )

        return jsonify({
            'prediction_index': pred_idx,
            'prediction':       class_name,
        }), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────
# 🔬 Predict with Grad-CAM (XAI)
# ─────────────────────────────────────────────
@app.route('/predict-xai', methods=['POST'])
def predict_with_xai():
    """
    Runs prediction + Grad-CAM on an enhanced image, saves the
    overlay back to disk, and updates the MongoDB record.

    JSON body:
      image_name — filename returned by /analyze (enhanced_image_name)

    Response includes base64-encoded CAM overlay for immediate display.
    """
    data       = request.get_json()
    image_name = data.get('image_name') if data else None
    if not image_name:
        return jsonify({'error': 'image_name is required'}), 400

    try:
        # ── Load & transform ─────────────────────────────────────────────
        img_pil = _load_pil(image_name)
        tensor  = transform(img_pil).unsqueeze(0).to(DEVICE)

        # ── Forward pass ─────────────────────────────────────────────────
        with torch.no_grad():
            logits   = model(tensor)
            pred_idx = logits.argmax(dim=1).item()

        class_name = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else str(pred_idx)

        # ── Grad-CAM ─────────────────────────────────────────────────────
        heatmap = _gradcam(tensor, pred_idx)
        overlay = _overlay_cam(img_pil, heatmap)        # BGR numpy

        # ── Save overlay ─────────────────────────────────────────────────
        base       = os.path.splitext(image_name)[0]
        cam_name   = f"cam_{base}.png"
        cam_path   = _save_image(overlay, cam_name)
        cam_b64    = _to_base64(cam_path)

        # ── Update MongoDB ────────────────────────────────────────────────
        results_col.update_one(
            {'enhanced_image_name': image_name},
            {'$set': {
                'prediction':     class_name,
                'cam_image_name': cam_name,
            }},
        )

        return jsonify({
            'prediction':     class_name,
            'cam_image_name': cam_name,
            'cam_base64':     cam_b64,
        }), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────
# 🏥 Health check
# ─────────────────────────────────────────────
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'status': 'Skin Lesion Classifier API is running',
        'device': str(DEVICE),
    })


# ─────────────────────────────────────────────
# 🏁 Run
# ─────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
