# Sub-project 1: AI Pipeline Design
**Date:** 2026-05-09
**Status:** Approved — ready for implementation planning

---

## Context

This is Sub-project 1 of 7 in the full Xai Skin Health app refactor. It covers only the Flask AI microservice (`model-server/`). All other sub-projects depend on the API shape defined here.

**Full sub-project order:**
1. **AI Pipeline** ← this spec
2. Backend Refactor (Node.js + ScanSession MongoDB schema)
3. Auth Upgrade (refresh tokens + MMKV)
4. Camera System (capture-then-detect, live bbox display)
5. Results / History UI (multi-lesion cards, GradCAM display)
6. UI/UX Redesign (premium floral overhaul)
7. Session Continuation Files (PROJECT_MASTER_STATE.md etc.)

---

## Problem

Current `model-server/app.py`:
- Single monolithic file (~620 lines)
- Single-lesion only: one image → one prediction → one GradCAM
- No YOLO detection step — classifier receives whole image
- No multi-lesion support

**Goal:** Add YOLOv12 Nano detection, multi-lesion cropping, per-lesion classification and GradCAM, all inside a clean modular architecture.

---

## Architecture Decision

**Chosen: Option B — Modular service layer with Flask Blueprints**

Rejected options:
- Option A (patch app.py): becomes 800+ lines, untestable
- Option C (YOLO microservice): overkill, adds network hop and deployment complexity

---

## File Layout

```
model-server/
├── app.py                  ← create_app() factory, registers blueprints
├── config.py               ← all env vars / constants (single source of truth)
├── image_quality.py        ← unchanged (blur/low-light helpers)
├── resnet50_best.pth       ← unchanged
├── best.pt                 ← YOLOv12 Nano weights (copy from Downloads)
│
├── services/
│   ├── __init__.py
│   ├── detector.py         ← YOLOv12: load model, run inference, return bboxes
│   ├── classifier.py       ← ResNet-50: load model, classify single crop
│   └── explainer.py        ← GradCAM: heatmap + overlay inside bbox coords
│
├── routes/
│   ├── __init__.py
│   ├── scan.py             ← POST /scan-multi (new multi-lesion endpoint)
│   └── legacy.py           ← POST /scan, /predict, /predict-xai, /analyze (preserved)
│
└── uploads/
```

**Boundary rules (enforced):**
- `services/` never imports from `routes/` — dependency flows one direction only
- `detector.py` returns raw bboxes, knows nothing about classification
- `classifier.py` accepts a PIL crop, returns prediction dict, knows nothing about YOLO
- `explainer.py` accepts tensor + class idx + crop PIL, returns heatmap projected to original coords
- All models loaded once at startup in each service module, never per-request

---

## Data Flow: POST /scan-multi

```
POST /scan-multi (multipart/form-data)
      │
      ▼
[1] Image Quality Enhancement
      source=camera → apply blur/low-light pipeline (lenient thresholds)
      source=gallery → SKIP enhancement (gallery images already processed)
      output: enhanced PIL image + quality metadata
      │
      ▼
[2] YOLO Detection  (services/detector.py)
      input:  enhanced image (numpy BGR)
      conf_threshold: 0.25 (filters at inference time, not post-hoc)
      output: list of bboxes [{x1,y1,x2,y2,conf}]
      edge case: 0 lesions → return {lesion_count:0, no_lesion_found:true}
      │
      ▼
[3] Per-Lesion Loop  (sequential — parallelism deferred to Sub-project performance pass)
      │
      ├─[3a] Crop original image to bbox region
      │
      ├─[3b] Classify crop  (services/classifier.py)
      │       ResNet-50 forward pass → {label, score, top_k[3]}
      │
      ├─[3c] GradCAM  (services/explainer.py)
      │       heatmap generated on 224×224 crop
      │       heatmap resized back to bbox pixel dimensions
      │       alpha-blended onto full image at bbox coords (alpha=0.45)
      │       bbox border drawn on top of heatmap (white, 2px)
      │       label + confidence rendered below bbox
      │
      └─[3d] Encode outputs
              crop → base64 PNG
              full image region → base64 PNG (overlay_b64)
      │
      ▼
[4] Compose final annotated image
      all bboxes + heatmaps rendered onto single image
      saved to uploads/, encoded base64
      │
      ▼
[5] MongoDB write (only if userId present in request)
      ScanSession document — schema defined in Sub-project 2
      │
      ▼
[6] JSON response (see API Contract section)
```

---

## Service Designs

### services/detector.py — LesionDetector

```python
class LesionDetector:
    def __init__(self, model_path: str, conf_threshold: float = 0.25):
        self.model = YOLO(model_path)   # Ultralytics, auto device selection
        self.conf = conf_threshold

    def detect(self, image_bgr: np.ndarray) -> list[dict]:
        results = self.model(image_bgr, conf=self.conf, verbose=False)
        boxes = []
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            boxes.append({
                "x1": int(x1), "y1": int(y1),
                "x2": int(x2), "y2": int(y2),
                "conf": float(box.conf[0])
            })
        return boxes   # empty list = no lesions found
```

### services/classifier.py — LesionClassifier

- Loads ResNet-50 from `resnet50_best.pth` at startup
- Accepts PIL crop of any size, resizes to 224×224 internally
- Returns `{label, score, top_k: [{label, score} × 3]}`
- Uses same transform logic as current `app.py` (no ImageNet normalization unless `NORMALIZE_INPUT=1`)

### services/explainer.py — GradCAMExplainer

**Key algorithm — heatmap inside bbox:**
1. Run GradCAM on 224×224 crop tensor → `heatmap float32 [0,1]`
2. `cv2.resize(heatmap, (bbox_w, bbox_h))` → exact bbox dimensions
3. `cv2.applyColorMap` → JET colormap
4. `cv2.addWeighted(roi, 0.55, heat_color, 0.45, 0)` → blend only inside bbox region
5. `cv2.rectangle` → draw bbox border on top
6. `cv2.putText` → label + confidence below bbox with dark background pill

Fail-soft: if GradCAM raises any exception, returns `None` — caller sets `overlay_b64: null`, does not abort scan.

---

## Image Quality Thresholds

| Setting | Old default | New default | Env var override |
|---|---|---|---|
| `BLUR_THRESHOLD` | 65.0 | 40.0 | `BLUR_THRESHOLD` |
| `LOW_LIGHT_THRESHOLD` | 30.0 | 20.0 | `LOW_LIGHT_THRESHOLD` |

Gallery images (`source=gallery`) bypass all quality checks entirely.

---

## Severity Mapping

Derived from ResNet-50 predicted label — no additional model needed:

| Severity | Labels |
|---|---|
| `urgent` | Melanoma, Basal cell carcinoma, squamous cell carcinoma, Actinic Keratoses |
| `check` | Eczema, Acne, hfmd, monkeypox, Vascular lesions, dermatofibroma, chickenpox |
| `stable` | healthy, melanocytic nevi, benign keratosis-like lesions |

---

## API Contract

### POST /scan-multi

**Request** (multipart/form-data):

| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | file | yes | JPEG/PNG, max 10MB |
| `userId` | string | no | Omit → skips Mongo write |
| `source` | string | no | `camera` (default) or `gallery` |

**Response — lesions found:**
```json
{
  "session_id": "mongo_objectid_or_null",
  "lesion_count": 2,
  "no_lesion_found": false,
  "partial_failure": false,
  "annotated_image_b64": "base64...",
  "quality_metadata": {
    "enhancements_applied": ["sharpening"],
    "source": "camera"
  },
  "lesions": [
    {
      "lesion_id": "uuid4-string (generated server-side via Python uuid.uuid4())",
      "bbox": { "x1": 120, "y1": 340, "x2": 280, "y2": 500, "conf": 0.91 },
      "diagnosis": {
        "label": "Melanoma",
        "score": 0.94,
        "top_k": [
          { "label": "Melanoma", "score": 0.94 },
          { "label": "Basal cell carcinoma", "score": 0.04 },
          { "label": "melanocytic nevi", "score": 0.01 }
        ]
      },
      "severity": "urgent",
      "crop_b64": "base64...",
      "overlay_b64": "base64..."
    }
  ]
}
```

**Response — no lesion detected:**
```json
{
  "session_id": null,
  "lesion_count": 0,
  "no_lesion_found": true,
  "partial_failure": false,
  "annotated_image_b64": null,
  "lesions": []
}
```

### Legacy routes (unchanged)
`POST /scan`, `POST /predict`, `POST /predict-xai`, `POST /analyze`, `GET /images/<user_id>`, `GET /`

---

## Error Handling

| Scenario | Behavior |
|---|---|
| GradCAM crashes for lesion N | `overlay_b64: null` for that lesion, rest of scan intact |
| Classifier crashes for lesion N | Lesion omitted from array, `partial_failure: true` in response |
| YOLO crashes entirely | HTTP 500 `{"error": "detection_failed"}` |
| Image unreadable | HTTP 400 `{"error": "Could not read image"}` |
| No file uploaded | HTTP 400 `{"error": "Missing image file"}` |
| Model server unreachable (Node proxy) | Node returns HTTP 502 |

---

## Dependencies to Add

```
# requirements.txt additions
ultralytics>=8.3.0   # YOLOv12 support
```

All other deps (torch, torchvision, opencv-python, pytorch-grad-cam, flask, pymongo) already present.

---

## Implementation Notes

- Copy `best.pt` from `C:\Users\admin\Downloads\best_model-20260509T105440Z-3-001\best_model\best.pt` into `model-server/`
- `config.py` must define `YOLO_MODEL_PATH` env var (default: `best.pt`)
- `YOLO_CONF_THRESHOLD` env var (default: `0.25`)
- Services instantiated as module-level singletons at import time (same pattern as current `model, target_layer = load_model()`)
- `create_app()` in `app.py` registers `scan_bp` (prefix `/`) and `legacy_bp` (prefix `/`)

---

## Session Continuation

If this session ends before implementation, any AI agent can continue by:
1. Reading this spec for the complete design
2. Running `writing-plans` skill to generate the implementation plan
3. Running `deep-implement` skill to execute the plan section by section

**Current state:** Design approved, implementation plan not yet written.
**Next action:** Invoke `writing-plans` skill with this spec as input.
