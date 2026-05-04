#!/usr/bin/env python
"""Test the Flask API endpoint"""

import requests
import numpy as np
from PIL import Image
import io

# Create a test image (random noise)
test_image = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))

# Save to bytes
img_bytes = io.BytesIO()
test_image.save(img_bytes, format='PNG')
img_bytes.seek(0)

# Send request to the API
try:
    print("Testing /predict endpoint...")
    response = requests.post(
        'http://localhost:5000/predict',
        files={'image': ('test.png', img_bytes, 'image/png')}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Prediction successful!")
        print(f"  - Label: {result['label']}")
        print(f"  - Confidence: {result['score']:.4f}")
        print(f"  - Model: {result['modelName']}")
        print(f"  - CAM Image: {'✓ Generated' if result['cam'] else 'Not generated'}")
    else:
        print(f"❌ Request failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    print("Make sure the Flask server is running on port 5000")

# Test the health check endpoint
try:
    print("\n\nTesting / health check endpoint...")
    response = requests.get('http://localhost:5000/')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Error: {e}")
