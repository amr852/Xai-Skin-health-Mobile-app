# Model server (Flask + PyTorch)

Skin lesion **ResNet-50 checkpoint** classifier with **Grad-CAM** explainability. Images are enhanced when blurry or low-light, then classified. Results can be stored in **MongoDB** when `userId` is supplied.

## Requirements

- **Python 3.11 or 3.12** recommended (match your installed `torch` wheels).
- Dependencies: see [`requirements.txt`](requirements.txt) (`torch`, `torchvision`, `flask`, `opencv-python-headless`, `pymongo`, `grad-cam`, …).

## Setup

```bash
cd model-server
python -m venv .venv
.venv\Scripts\activate   # Windows PowerShell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Place your checkpoint next to the app or set `MODEL_PATH`. The default file name is `resnet50_best.pth`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `resnet50_best.pth` | Path to PyTorch state dict or checkpoint dict with `model_state_dict` / `state_dict`. |
| `CLASS_NAMES` | _(unset)_ | Optional comma-separated label names in checkpoint index order. |
| `IMG_SIZE` | `224` | Square resize side for inference. |
| `NORMALIZE_INPUT` | `0` | Set to `1`/`true` if your checkpoint was trained with ImageNet normalization. |
| `BLUR_THRESHOLD` | `70.0` | Lower value = less strict blur detection (fewer images sharpened). |
| `LOW_LIGHT_THRESHOLD` | `50.0` | Brightness threshold for low-light enhancement. |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string. |
| `DB_NAME` | `skinsense` | Database name for `skin_analysis_results`. |
| `UPLOAD_FOLDER` | `uploads` | Directory for saved originals, enhanced images, and CAM overlays. |
| `PORT` | `5000` | HTTP port when running `python app.py`. |

Class labels are defined in `app.py` as `CLASS_NAMES` and can be overridden via the `CLASS_NAMES` env variable.
If the checkpoint’s `fc` output size does not match the active label list, the server falls back to numeric labels (`class_0`, …) and logs a warning.

## Run

```powershell
set MODEL_PATH=resnet50_best.pth
set MONGO_URI=mongodb://localhost:27017
python app.py
```

The Node proxy (`xai-skin-backend`) should set `MODEL_SERVER_URL` (e.g. `http://localhost:5000`) and call **`POST /scan`** with multipart `image` and optional `userId`.

## HTTP API (summary)

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| `GET` | `/` | — | Health: status + device. |
| `POST` | `/scan` | multipart `image`, optional `userId` | Enhance → predict → Grad-CAM → JSON with `prediction`, `score`, `top_predictions`, `cam_base64`, etc. |
| `POST` | `/analyze` | multipart `image`, form `userId` | Quality + enhancement only; inserts Mongo record without prediction. |
| `POST` | `/predict` | JSON `{ "image_name": "…" }` | Classify an already saved enhanced filename. |
| `POST` | `/predict-xai` | JSON `{ "image_name": "…" }` | Predict + Grad-CAM overlay; updates Mongo. |
| `GET` | `/images/<user_id>` | — | List analysis documents for a user. |

### `POST /scan` (used by the mobile stack)

**Form fields**

- `image` (file, required)
- `userId` (string, optional) — when set, inserts a document into `skin_analysis_results`.

**Example JSON response**

```json
{
  "prediction": "melanocytic nevi",
  "prediction_index": 9,
  "score": 0.87,
  "top_predictions": [
    { "label": "melanocytic nevi", "score": 0.87 },
    { "label": "healthy", "score": 0.05 }
  ],
  "enhancements_applied": [],
  "xai_method": "Grad-CAM",
  "model_name": "resnet50_best",
  "cam_base64": "<base64-png>",
  "record_id": "…",
  "enhanced_image_name": "enh_…"
}
```

Preprocessing defaults to plain resize + tensor conversion (**no ImageNet normalization**).  
If your checkpoint was trained with ImageNet normalization, set `NORMALIZE_INPUT=1`.
