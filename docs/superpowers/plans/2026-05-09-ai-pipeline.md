# Implementation Plan: AI Pipeline (Sub-project 1)

**Date:** 2026-05-09
**Spec:** [docs/superpowers/specs/2026-05-09-ai-pipeline-design.md](../specs/2026-05-09-ai-pipeline-design.md)
**Scope:** Flask microservice `model-server/` only — YOLO multi-lesion detection, per-lesion ResNet-50 + GradCAM, `POST /scan-multi`, legacy routes preserved.

---

## Goals

- Replace monolithic `app.py` with `create_app()` factory and Blueprints.
- Add YOLOv12 Nano (`best.pt`) detection before classification.
- Return multi-lesion JSON per API contract; fail-soft GradCAM; partial failure on per-lesion classifier errors.
- Centralize configuration and severity mapping in `config.py`.
- Keep single-load model pattern (module-level singletons in services).

---

## File checklist

| File | Action |
|------|--------|
| `config.py` | Create: env vars, class names, `get_severity()`, YOLO paths, quality defaults (blur 40, low-light 20). |
| `services/__init__.py` | Create (empty or re-exports). |
| `services/detector.py` | Create: `LesionDetector`, Ultralytics YOLO, `detect(image_bgr)`. |
| `services/classifier.py` | Create: load ResNet-50 checkpoint, `LesionClassifier.predict(pil)` -> label, score, top_k. |
| `services/explainer.py` | Create: `GradCAMExplainer` — heatmap on 224 crop, resize to bbox, blend 0.55/0.45, border + text; full-image helper for legacy overlay 0.6/0.4. |
| `helpers.py` | Create: disk/base64, `_save_enhanced_pair_from_upload`, shared small utils. |
| `routes/__init__.py` | Create. |
| `routes/legacy.py` | Create: Blueprint — `/`, `/scan`, `/predict`, `/predict-xai`, `/analyze`, `/images/<user_id>`. |
| `routes/scan.py` | Create: Blueprint — `POST /scan-multi` (gallery skips enhancement). |
| `app.py` | Rewrite: `create_app()`, CORS, Mongo, register blueprints, `app` instance for `python app.py`. |
| `requirements.txt` | Add `ultralytics>=8.3.0`. |
| `best.pt` | Copy from Downloads path into `model-server/`. |

Unchanged: `image_quality.py`, `resnet50_best.pth`, `uploads/`.

---

## Implementation order

1. **config.py** — Single source for `MONGO_URI`, `DB_NAME`, `UPLOAD_FOLDER`, `MODEL_PATH`, `CLASS_NAMES`, `NORMALIZE_INPUT`, `IMG_SIZE`, new defaults `BLUR_THRESHOLD=40`, `LOW_LIGHT_THRESHOLD=20`, `YOLO_MODEL_PATH`, `YOLO_CONF_THRESHOLD=0.25`, `get_severity(label)` with case-insensitive label sets from spec.
2. **services/classifier.py** — Port `load_model()` from current `app.py`: checkpoint unwrap, fc size, set evaluation mode on the PyTorch module, expose `model`, `target_layer`, `DEVICE`, `transform`, `LesionClassifier`.
3. **services/explainer.py** — Import `model`, `target_layer`, `DEVICE` from classifier; GradCAM heatmap normalize [0,1]; ROI blend for scan-multi; full-PIL overlay 0.6/0.4 for legacy.
4. **services/detector.py** — `YOLO(YOLO_MODEL_PATH)`, `detect()` returns list of `{x1,y1,x2,y2,conf}`.
5. **helpers.py** — `_save_image`, `_load_pil`, `_to_base64`, `_encode_pil`, `_save_enhanced_pair_from_upload` using `config` thresholds.
6. **routes/legacy.py** — Move handlers from `app.py`; use `current_app.config['RESULTS_COL']`; preserve contracts.
7. **routes/scan.py** — Multipart fields; camera vs gallery; YOLO; per-lesion loop; `uuid4` ids; mongo `scan_sessions` when `userId` and lesions > 0; composite annotated image.
8. **app.py** — Factory, register blueprints, module `app = create_app()`.
9. **Smoke** — Import app factory; hit `GET /`.

---

## API / behavior notes

- **POST /scan-multi** matches spec; Mongo write when `userId` present and lesions found.
- **Legacy routes** same shapes; new default quality thresholds unless env overrides.
- **Errors:** unreadable image 400; missing file 400; YOLO failure 500 `{"error": "detection_failed"}`; classifier per-lesion failure omits lesion + `partial_failure: true`; GradCAM failure sets `overlay_b64: null`.

---

## Out of scope (later sub-projects)

- Node `ScanSession` final schema, proxy `/scan-multi`.
- Auth, camera UI, results UI redesign.

---

## Risks / mitigations

- **Ultralytics + torch:** Adjust pins if needed.
- **CPU GradCAM:** Acceptable for v1.

---

## Done criteria

- Listed files exist; `create_app()` imports without error.
- Legacy endpoints smoke-test; `/scan-multi` returns spec-shaped JSON for 0 and N lesions.
