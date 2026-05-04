import os
import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.environ.get('MODEL_PATH')
CLASS_NAMES = [name.strip() for name in os.environ.get('CLASS_NAMES', 'benign,malignant').split(',') if name.strip()]
IMG_SIZE = int(os.environ.get('IMG_SIZE', 224))


def find_target_conv_layer(model):
    for layer in reversed(model.layers):
        output_shape = None
        try:
            output_shape = layer.output_shape
        except AttributeError:
            output_shape = getattr(getattr(layer, 'output', None), 'shape', None)

        if output_shape is not None and len(output_shape) == 4:
            return layer.name
    raise ValueError('No convolutional layer found in the model.')


def load_prediction_model():
    if MODEL_PATH and os.path.exists(MODEL_PATH):
        model = load_model(MODEL_PATH)
        return model, os.path.basename(MODEL_PATH)
    return ResNet50(weights='imagenet'), 'resnet50-imagenet'

model, MODEL_NAME = load_prediction_model()
TARGET_LAYER_NAME = find_target_conv_layer(model)


def prepare_image(image: Image.Image) -> np.ndarray:
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((IMG_SIZE, IMG_SIZE))
    array = np.asarray(image, dtype=np.float32)
    array = np.expand_dims(array, axis=0)
    return preprocess_input(array)


def make_cam_image(original: Image.Image, heatmap: np.ndarray) -> str:
    heat = Image.fromarray(np.uint8(255 * heatmap)).resize(original.size)
    heat = heat.convert('RGB')
    heat = Image.blend(original.convert('RGB'), heat, alpha=0.4)
    buffer = io.BytesIO()
    heat.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def compute_gradcam(image_array: np.ndarray, prediction_index: int) -> np.ndarray:
    grad_model = tf.keras.models.Model(
        inputs=[model.inputs],
        outputs=[model.get_layer(TARGET_LAYER_NAME).output, model.output],
    )
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(image_array)
        loss = predictions[:, prediction_index]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = tf.reduce_mean(tf.multiply(pooled_grads, conv_outputs), axis=-1)
    heatmap = tf.maximum(heatmap, 0) / (tf.reduce_max(heatmap) + 1e-9)
    return heatmap.numpy()


def decode_prediction(preds: np.ndarray):
    if MODEL_NAME == 'resnet50-imagenet':
        decoded = decode_predictions(preds, top=1)[0][0]
        return decoded[1], float(decoded[2])

    logits = preds[0]
    if logits.ndim == 0 or logits.shape[-1] == 1:
        score = float(tf.sigmoid(logits).numpy().reshape(-1)[0])
        label = CLASS_NAMES[0] if score >= 0.5 else (CLASS_NAMES[1] if len(CLASS_NAMES) > 1 else 'positive')
        return label, score

    probs = tf.nn.softmax(logits).numpy()
    index = int(np.argmax(probs))
    score = float(probs[index])
    label = CLASS_NAMES[index] if index < len(CLASS_NAMES) else str(index)
    return label, score


def analyze_image(image: Image.Image):
    image_array = prepare_image(image)
    preds = model.predict(image_array)
    label, score = decode_prediction(preds)
    target_index = int(np.argmax(preds[0])) if preds.ndim > 1 else 0
    heatmap = compute_gradcam(image_array, target_index)
    cam_image = make_cam_image(image, heatmap)
    return {
        'label': label,
        'score': score,
        'modelName': MODEL_NAME,
        'cam': cam_image,
    }


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'Missing image file'}), 400

    file = request.files['image']
    try:
        image = Image.open(file.stream)
    except Exception:
        return jsonify({'error': 'Invalid image file'}), 400

    try:
        result = analyze_image(image)
        return jsonify(result)
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/', methods=['GET