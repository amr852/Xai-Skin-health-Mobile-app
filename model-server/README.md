# Model server (Flask + PyTorch)

Skin lesion stack: **YOLOv12 nano (`yolo12n`)** detection (`best.pt` from your yolo12n training run) plus **ResNet-50** crops with **Grad-CAM**. Camera images are enhanced when blurry or low-light; gallery skips that step. Results can be stored in **MongoDB** when `userId` is supplied.

**Weights:** Put your Ultralytics **yolo12n** training **`best.pt`** in `model-server/` (default filename `best.pt`). At startup the server checks `train_args.model` in the checkpoint and warns (or aborts with `YOLO_STRICT_ARCH=1`) if it is not yolo12n-family.

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

Place **`resnet50_best.pth`** (classifier) and **`best.pt`** (YOLOv12 **nano** detector) next to the app, or set `MODEL_PATH` / `YOLO_MODEL_PATH`.

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
| `YOLO_MODEL_PATH` | `best.pt` (in app dir) | Path to **yolo12n** Ultralytics `best.pt` weights. |
| `YOLO_CONF_THRESHOLD` | `0.25` | Minimum detection confidence. |
| `YOLO_STRICT_ARCH` | `0` | Set to `1` to **exit** if the checkpoint is not trained from yolo12n. |
| `PORT` | `5000` | HTTP port when running `python app.py`. |

Class labels are defined in `app.py` as `CLASS_NAMES` and can be overridden via the `CLASS_NAMES` env variable.
If the checkpoint’s `fc` output size does not match the active label list, the server falls back to numeric labels (`class_0`, …) and logs a warning.

## Run

```powershell
set MODEL_PATH=resnet50_best.pth
set MONGO_URI=mongodb://localhost:27017
python app.py
```

The Node proxy (`xai-skin-backend`) should set `MODEL_SERVER_URL` (e.g. `http://localhost:5000`) and call **`POST /scan-multi`** (multi-lesion) or legacy **`POST /scan`** with multipart `image` and optional `userId`.

`GET /` returns `yolo_train_base` (e.g. `yolo12n.pt`) and `yolo_expected` so you can confirm the correct weights are loaded.

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
