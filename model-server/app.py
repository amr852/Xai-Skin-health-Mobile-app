import os
import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from torchvision.models.feature_extraction import create_feature_extractor

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.environ.get('MODEL_PATH')
CLASS_NAMES = [name.strip() for name in os.environ.get('CLASS_NAMES', 'benign,malignant').split(',') if name.strip()]
IMG_SIZE = int(os.environ.get('IMG_SIZE', 224))

# Set device
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Define preprocessing transforms
transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def load_pytorch_model():
    """Load PyTorch ResNet50 model from .pth file"""
    global CLASS_NAMES
    
    # Try to load resnet50_best.pth first
    pth_model_path = 'resnet50_best.pth'
    if os.path.exists(pth_model_path):
        print(f"Loading PyTorch model from {pth_model_path}")
        try:
            # First, load the checkpoint to determine the correct output size
            checkpoint = torch.load(pth_model_path, map_location=DEVICE, weights_only=False)
            
            # Determine the number of classes from the checkpoint
            if isinstance(checkpoint, dict):
                if 'model_state_dict' in checkpoint:
                    state_dict = checkpoint['model_state_dict']
                elif 'state_dict' in checkpoint:
                    state_dict = checkpoint['state_dict']
                else:
                    state_dict = checkpoint
            else:
                state_dict = checkpoint
            
            # Extract number of classes from fc layer
            fc_weight_shape = state_dict.get('fc.weight', None)
            if fc_weight_shape is not None:
                num_classes = fc_weight_shape.shape[0]
            else:
                num_classes = len(CLASS_NAMES) if CLASS_NAMES else 2
            
            print(f"Detected {num_classes} output classes from checkpoint")
            
            # Create model with correct output size
            model = models.resnet50(weights=None)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
            
            # Load the state dict
            if isinstance(checkpoint, dict):
                if 'model_state_dict' in checkpoint:
                    model.load_state_dict(checkpoint['model_state_dict'])
                elif 'state_dict' in checkpoint:
                    model.load_state_dict(checkpoint['state_dict'])
                else:
                    model.load_state_dict(checkpoint)
            else:
                model.load_state_dict(checkpoint)
            
            model = model.to(DEVICE)
            model.eval()
            
            # Update CLASS_NAMES if needed
            if not CLASS_NAMES or len(CLASS_NAMES) != num_classes:
                CLASS_NAMES = [f'class_{i}' for i in range(num_classes)]
                print(f"Updated CLASS_NAMES to {len(CLASS_NAMES)} classes")
            
            return model, 'resnet50-best', True
        except Exception as e:
            print(f"Error loading PyTorch model: {e}")
            raise

def load_prediction_model():
    """Load model - tries PyTorch first, then falls back to TensorFlow"""
    try:
        model, model_name, is_pytorch = load_pytorch_model()
        return model, model_name, is_pytorch
    except Exception as e:
        print(f"Failed to load PyTorch model: {e}")
        print("Model loading failed. Please ensure resnet50_best.pth is valid.")
        raise

model, MODEL_NAME, IS_PYTORCH = load_prediction_model()

# For PyTorch models, get feature extractor for GradCAM
if IS_PYTORCH:
    try:
        feature_extractor = create_feature_extractor(
            model, return_nodes={'layer4': 'features'}
        )
        forward_pass = create_feature_extractor(
            model, return_nodes={'layer4': 'features', 'avgpool': 'pool'}
        )
    except Exception as e:
        print(f"Warning: Could not create feature extractor: {e}")
        feature_extractor = None

def prepare_image(image: Image.Image) -> torch.Tensor:
    """Prepare image for PyTorch model"""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    tensor = transform(image)
    return tensor.unsqueeze(0).to(DEVICE)

def make_cam_image(original: Image.Image, heatmap: np.ndarray) -> str:
    """Create Grad-CAM visualization"""
    heat = Image.fromarray(np.uint8(255 * heatmap)).resize(original.size)
    heat = heat.convert('RGB')
    heat = Image.blend(original.convert('RGB'), heat, alpha=0.4)
    buffer = io.BytesIO()
    heat.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')

def compute_gradcam(image_tensor: torch.Tensor, target_class: int) -> np.ndarray:
    """Compute Grad-CAM heatmap for PyTorch model"""
    image_tensor.requires_grad = True
    
    # Forward pass to get features
    with torch.enable_grad():
        # Get activations from the last convolutional layer
        activations = feature_extractor(image_tensor)['features']
        
        # Get logits
        logits = model(image_tensor)
        target_score = logits[0, target_class]
        
        # Compute gradients
        grads = torch.autograd.grad(
            target_score, 
            activations, 
            create_graph=True, 
            allow_unused=True
        )[0]
    
    # Compute CAM
    if grads is not None:
        pooled_grads = torch.mean(grads, dim=(0, 2, 3))
        activations = activations.detach()
        for i in range(activations.shape[1]):
            activations[:, i, :, :] *= pooled_grads[i]
        heatmap = torch.mean(activations, dim=1).squeeze(0).detach().cpu().numpy()
    else:
        # Fallback: just use activations mean
        heatmap = torch.mean(activations.detach(), dim=1).squeeze(0).cpu().numpy()
    
    # Normalize heatmap
    heatmap = np.maximum(heatmap, 0)
    if heatmap.max() > 0:
        heatmap = heatmap / heatmap.max()
    
    return heatmap

def decode_prediction(logits: torch.Tensor) -> tuple:
    """Decode model predictions"""
    probs = torch.nn.functional.softmax(logits, dim=1)
    score, class_idx = torch.max(probs, 1)
    
    class_idx = class_idx.item()
    score = score.item()
    
    label = CLASS_NAMES[class_idx] if class_idx < len(CLASS_NAMES) else str(class_idx)
    return label, score, class_idx

def analyze_image(image: Image.Image):
    """Analyze image and return prediction with CAM"""
    image_tensor = prepare_image(image)
    
    with torch.no_grad():
        logits = model(image_tensor)
    
    label, score, class_idx = decode_prediction(logits)
    
    # Compute Grad-CAM
    try:
        heatmap = compute_gradcam(image_tensor, class_idx)
        cam_image = make_cam_image(image, heatmap)
    except Exception as e:
        print(f"Warning: Could not compute Grad-CAM: {e}")
        cam_image = ""
    
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


@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'ok', 'model': MODEL_NAME, 'device': str(DEVICE)})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

