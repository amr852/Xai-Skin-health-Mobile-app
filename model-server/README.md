# Model Server

This Flask app exposes a `/predict` endpoint that accepts an image file and returns:

- `label`: predicted class
- `score`: confidence score
- `modelName`: model identity
- `cam`: base64-encoded Grad-CAM overlay image

## Setup

This server requires a Python version supported by TensorFlow. Python 3.12 or 3.11 is recommended.

```bash
cd model-server
python -m venv .venv
.venv\Scripts\activate   # Windows PowerShell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If you are using Python 3.14, TensorFlow is not available and you must install a supported interpreter.

## Run

```bash
set MODEL_PATH=path\to\your\model.h5
set CLASS_NAMES=benign,malignant
python app.py
```

If `MODEL_PATH` is not set, the server loads `ResNet50(weights='imagenet')` as a fallback.

## API

`POST /predict`
- form field: `image`

Response example:

```json
{
  "label": "melanoma",
  "score": 0.87,
  "modelName": "custom-model.h5",
  "cam": "<base64-png>"
}
```
