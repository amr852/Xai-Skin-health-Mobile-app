# Project master state — Xai Skin Health

Last updated: 2026-05-09 (session handoff).

## Image & media storage (do not change without product sign-off)

- **Node (`xai-skin-backend`)**: uploads are written to **`public/uploads/`** on the API host. MongoDB stores **URLs** (`imageUrl`, `originalImageUrl`, `annotatedImageUrl`, per-lesion crop/overlay URLs, etc.) — not binary blobs in GridFS for these flows.
- **Flask (`model-server`)**: inference only; PNGs pass through the Node layer for persistence.
- **Mobile app**: sends **multipart image** to Node; it does not introduce third-party object storage.

## Implemented product threads

- AI pipeline (YOLO12n check, ResNet classifier, Grad-CAM, `/scan-multi`).
- Node: `/lesions/analyze`, `/scan-sessions` (POST/GET), `Lesion` + `ScanSession` models.
- Auth: access + refresh JWTs, refresh/logout routes, MMKV + AsyncStorage fallback in app.
- App: camera/gallery analyze, bbox overlays, history (lesions + server sessions), floral theme tokens, scan analysis via **`POST /scan-sessions`** so session history stays in sync with the pipeline.
- **Session results screen**: `app/scan-session/[id].tsx` — full report (warm `Gradient.surfaceTint` hero, `Hairline`, `StatusArc`, bbox hero, Grad-CAM card + modal, per-region cards with sage/rose accents). Entry: History → Sessions → **Full session report**.

## Automated tests

| Stack | Command | Notes |
|--------|---------|--------|
| Node API | `cd xai-skin-backend && npm install && npm test` | `GET /health` smoke (supertest). |
| model-server | `cd model-server && pip install -r requirements-dev.txt && python -m pytest` | `config.get_severity` + class list (no torch). Use `python -m pytest` if `pytest` is not on `PATH`. |
| MyApp | `cd MyApp && npm install && npm test` | `lib/bboxLayout` unit tests (jest-expo). |

## Ops notes

- **MMKV**: production builds often need a **dev client / `expo prebuild`**; Expo Go uses AsyncStorage fallback.
- **Python**: model-server venv **3.10–3.12** recommended; 3.14 had pip friction in dev.
- **Legacy Mongo `Lesion` docs** without `analysis.lesions`: Regions UI expects that field — re-scan or run a one-off migration if needed.

## Not done (optional backlog)

- Broader coverage: authenticated API routes (mock JWT), Flask route tests (heavier deps), RN component tests.
- Mongo migration script for legacy `Lesion` rows missing `analysis.lesions`.
