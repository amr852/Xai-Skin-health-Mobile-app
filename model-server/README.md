# Model server (Flask + PyTorch)

Skin lesion stack: **YOLOv12 nano (`yolo12n`)** detection + **hierarchical EfficientNet-B0** classifier (primary `benign|malignant` → specialist 5-class benign OR 2-class malignant) with **Grad-CAM** on the specialist head. Camera images are enhanced when blurry or low-light; gallery skips that step. Results can be stored in **MongoDB** when `userId` is supplied.

**Weights:** Put your Ultralytics **yolo12n** `best.pt` in `model-server/` (default filename `best.pt`). At startup the server checks `train_args.model` and warns (or aborts with `YOLO_STRICT_ARCH=1`) if it is not yolo12n-family. EfficientNet weights default to `C:\Users\admin\Desktop\Effnetb1\*.pth` and are overridable via env.

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

Place the three EfficientNet-B0 checkpoints (`primary`, `benign`, `malignant`) at the configured paths and **`best.pt`** (yolo12n) next to the app, or override via env vars below.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PRIMARY_WEIGHTS` | `…\Effnetb1\primary_effnet_b0_best (2).pth` | 2-class benign\|malignant head. |
| `BENIGN_WEIGHTS` | `…\Effnetb1\benign_effnet_b0_best (2).pth` | 5-class benign specialist. |
| `MALIGNANT_WEIGHTS` | `…\Effnetb1\malignant_effnet_b0_best (2).pth` | 2-class malignant specialist. |
| `PRIMARY_CLASSES` | `benign,malignant` | Index order **must** match the primary checkpoint. |
| `BENIGN_CLASSES` | `akiec,bkl,df,nv,vasc` | Index order **must** match the benign checkpoint. If all crops are predicted as `nv`, the order is wrong — re-derive from your training script and override here. |
| `MALIGNANT_CLASSES` | `melanoma,basal_cell_carcinoma` | Index order **must** match the malignant checkpoint. |
| `IMG_SIZE` | `224` | Square resize side for inference. |
| `NORMALIZE_INPUT` | `1` | EfficientNet-B0 expects ImageNet normalization; keep on. |
| `BLUR_THRESHOLD` | `20.0` | Laplacian variance below this → sharpen pass. |
| `LOW_LIGHT_THRESHOLD` | `10.0` | Mean HSV V below this → brightness/contrast pass. |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string. |
| `DB_NAME` | `skinsense` | Database name. |
| `UPLOAD_FOLDER` | `uploads` | Originals, enhanced images, CAM overlays. |
| `YOLO_MODEL_PATH` | `best.pt` | Path to yolo12n Ultralytics weights. |
| `YOLO_CONF_THRESHOLD` | `0.25` | Minimum detection confidence. |
| `YOLO_STRICT_ARCH` | `0` | `1` aborts startup if checkpoint isn't yolo12n. |
| `PORT` | `5000` | HTTP port when running `python app.py`. |

Checkpoints carry **no embedded label metadata** — class order is supplied by `*_CLASSES` env vars. If predictions look stuck on one class, the most likely root cause is mismatched label order; verify against your training notebook and override.

## Run

```powershell
python app.py
```

The Node proxy (`xai-skin-backend`) sets `MODEL_SERVER_URL` (e.g. `http://localhost:5000`) and calls:

- **`POST /scan-multi`** — full pipeline: detect → per-crop hierarchical predict → specialist Grad-CAM.
- **`POST /detect-fast`** — detector-only (mobile Live mode, ~3 fps reticle crop).

`GET /` returns model paths + yolo train base + quality thresholds.

## HTTP API (summary)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Health + active config. |
| `POST` | `/scan-multi` | multipart `image`, optional `userId` → JSON `{lesions[{primary, specialist, bbox, crop_b64, overlay_b64}]}`. |
| `POST` | `/detect-fast` | multipart `image` (max 512 px long side) → normalized boxes only. |
| `POST` | `/scan` (legacy) | Single-lesion shim; uses hierarchical heads under the hood. |
| `POST` | `/analyze` (legacy) | Quality + enhancement only. |
| `POST` | `/predict` (legacy) | Classify already-saved enhanced filename. |
| `POST` | `/predict-xai` (legacy) | Classify + Grad-CAM. |
| `GET` | `/images/<user_id>` | List analysis documents for a user. |

### `POST /scan-multi` example response

```json
{
  "session_id": "…",
  "lesion_count": 1,
  "no_lesion_found": false,
  "lesions": [{
    "lesion_id": "…",
    "bbox": {"x1": 12, "y1": 30, "x2": 240, "y2": 260, "conf": 0.81},
    "primary": {"label": "benign", "display": "Benign", "score": 0.93},
    "specialist": {
      "label": "nv",
      "display": "Melanocytic Nevus",
      "score": 0.71,
      "top_k": [{"label": "nv", "score": 0.71}, {"label": "bkl", "score": 0.18}]
    },
    "severity": "stable",
    "crop_b64": "<base64-png>",
    "overlay_b64": "<base64-png>"
  }],
  "annotated_image_b64": "<base64-png>"
}
```
