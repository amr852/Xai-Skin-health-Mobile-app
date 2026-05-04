#!/usr/bin/env python
"""Test script to verify PyTorch and model loading"""

print("Testing PyTorch imports...")
import torch
print(f"✓ PyTorch loaded: {torch.__version__}")

import torchvision
print(f"✓ Torchvision loaded: {torchvision.__version__}")

from torchvision import models, transforms
print("✓ Models and transforms imported")

from torchvision.models.feature_extraction import create_feature_extractor
print("✓ Feature extractor imported")

print("\nTesting model loading...")
import os
import torch.nn as nn
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Check if model file exists
if os.path.exists('resnet50_best.pth'):
    print(f"✓ Model file found: resnet50_best.pth ({os.path.getsize('resnet50_best.pth') / 1e6:.1f} MB)")
    
    # Try loading the weights
    try:
        checkpoint = torch.load('resnet50_best.pth', map_location='cpu', weights_only=False)
        print(f"✓ Checkpoint loaded successfully")
        
        # Determine the state dict
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
            print(f"✓ Detected {num_classes} output classes from checkpoint")
        else:
            num_classes = 14  # default
            print(f"⚠ Could not detect output classes, using {num_classes}")
        
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
        
        model.eval()
        print("✓ Model weights loaded successfully")
        
        # Test a forward pass with dummy input
        dummy_input = torch.randn(1, 3, 224, 224)
        with torch.no_grad():
            output = model(dummy_input)
        print(f"✓ Forward pass successful, output shape: {output.shape}")
        
        print(f"\n✅ All tests passed! Model is ready to use.")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        import traceback
        traceback.print_exc()
else:
    print("❌ Model file not found: resnet50_best.pth")

