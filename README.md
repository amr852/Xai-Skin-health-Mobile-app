# Xai Skin Health — monorepo

**For AI coding agents:** Read this file first. It summarizes architecture, runbooks, and where to edit code so you do not need to scan the entire repository for routine tasks.

## What this is

- **MyApp/** — React Native (Expo SDK 54) mobile client: skin photo capture, multi-lesion scan UI, history, auth.
- **xai-skin-backend/** — Node.js (Express) + MongoDB: auth, lesion CRUD, **scan session** orchestration (incl. user-editable scan metadata). Receives uploads and calls the Python model server.
- **model-server/** — Flask app: YOLO-style detector → per-crop classifier → Grad-CAM; returns boxes, diagnoses, crops, overlays. Aggregate whole-image boxes and nested boxes are deduped **before** classification using **soft containment** — see `services/bbox_dedupe.py`, used from `routes/scan.py`.

End-to-end scan: **App** `POST /scan-sessions` (multipart image) → **Node** persists session, forwards to **Flask** `POST /scan-multi` → JSON back with `lesions[]` (bbox, diagnosis, `crop_b64` / `overlay_b64` stored as files in Node). History is **scan-first** (every scan is shown, named, and editable); users can also save specific regions from a scan as tracked lesion records.

**Live mode (shipped)**: the camera screen runs real-time detection by default — the app streams ~320 px frames at 3 fps from the centered 220 px reticle to Flask **`POST /detect-fast`** (detector-only, no classifier, no Grad-CAM) and overlays bboxes on the live preview. Each bbox renders with a class+confidence chip (e.g. `Basal cell carcinoma 0.94`), and a top-of-screen status pill shows `Scanning… place lesion inside the box` while idle, switching to red `Lesion Detected! (N)` when detections are present. Reticle is mapped through the camera preview's aspect-fill (cover) scale via `reticleCropInPhotoPx` so the crop hits the right region in source-photo pixels (not layout px). Live frames are never persisted; tapping the shutter captures a fresh hi-res still, crops it to the same reticle, and runs the full `/scan-sessions` pipeline. Plan: [`docs/superpowers/plans/2026-05-15-unified-realtime-lesion-detection.md`](docs/superpowers/plans/2026-05-15-unified-realtime-lesion-detection.md). Tracker: [`planning/realtime-lesion-detection-plan.md`](planning/realtime-lesion-detection-plan.md). Spec: [`planning/realtime-lesion-detection.md`](planning/realtime-lesion-detection.md). Dev-box latency note: p50 ≈ 257 ms on CPU YOLOv12n — above 150 ms spec; client 3 fps cap absorbs it. Production needs GPU/quant.

## Quick start (human or agent)

| Layer | Directory | Typical command | Default URL |
|--------|-----------|-----------------|-------------|
| Mobile | `MyApp/` | `npx expo start` | Metro; API from `EXPO_PUBLIC_API_URL` or LAN host **:3000** (see `MyApp/lib/api.ts`) |
| API | `xai-skin-backend/` | `npm start` | **http://localhost:3000** |
| Models | `model-server/` | Flask app entry (see that folder’s docs / `requirements.txt`) | **http://localhost:5000** (Node uses `MODEL_SERVER_URL`) |

**Mobile → API:** Set `EXPO_PUBLIC_API_URL` (e.g. `http://192.168.x.x:3000`) for physical devices if auto-discovery fails.

**Node → Flask:** `xai-skin-backend`: `MODEL_SERVER_URL` (default `http://localhost:5000`).

**Node → Mongo:** `MONGODB_URI` (default `mongodb://localhost:27017/xai-skin-health`).

## Key files (edit here first)

### Mobile (`MyApp/`)

- **`app/(tabs)/camera.tsx`** — Scan flow: camera (with always-on live detection overlays inside the reticle, class+conf chip per bbox, and a Scanning/Detected status pill), review, analysis hook, bbox overlay, XAI carousel, loading. Shutter cropper uses `cropToReticle(uri, layoutW, layoutH, photo.width, photo.height)` — never pass layout coords directly to ImageManipulator.crop. Blur gate via `ensureSharpEnough` runs on both camera + gallery inputs at `LAPLACIAN_VARIANCE_THRESHOLD = 15` (lenient — typical handheld skin photos pass; severe motion blur still rejected).
- **`hooks/useLiveDetect.ts`** — 3 fps capture loop driving `/detect-fast`. Owns AppState pause, 2-failure offline banner, abort-on-disable, reticle crop via `reticleCropInPhotoPx`. Tests: `__tests__/useLiveDetect.test.ts` (mocks `expo-image-manipulator` — coord math is covered separately in `bboxLayout.test.ts`).
- **`lib/bboxLayout.ts`** — `containLayout` / `bboxToOverlayRect` for static bbox projection, plus **`reticleCropInPhotoPx`** which inverts the camera's aspect-fill scale to map a screen-space reticle into source-photo pixel coordinates (handles raw-sensor landscape vs portrait layout). Use this for any "crop the on-screen region from a `takePictureAsync` photo" operation.
- **`app/(tabs)/history.tsx`** — Scan-first history UI; scan cards (with user-editable title/description/location), `EditScanModal`, region modal, "save region as lesion" action.
- **`app/(tabs)/index.tsx`** + **`components/home/MonitorLesionsSection.tsx`** + **`components/home/SelfExamCard.tsx`** — Home dashboard: severity stats and totals are **scan-driven** (from `useScanSessions`); lesion records are still fetched only to drive urgent push alerts.
- **`app/scan-session/[id].tsx`** — Full scan report; per-region save action into lesion records.
- **`hooks/useLesions.ts`** — `analyzeImage` → `/scan-sessions`; lesion persistence + analysis typing.
- **`hooks/useScanSessions.ts`** — fetch / delete / **update** (`updateSession` → `PATCH /scan-sessions/:id`) and normalize media URLs.
- **`lib/api.ts`** — API base URL resolution (`EXPO_PUBLIC_API_URL`, Metro host, emulator defaults).
- **`lib/mediaUrl.ts`** — Normalizes API/media URLs (`localhost`/`127.0.0.1`/relative paths) for real-device reachability.
- **`constants/theme.ts`** — **Single source for colors/spacing** (`C`, `Radius`, `Overlay`, etc.). Do not hardcode plum/rose hex in UI; use tokens.
- **`components/ImageWithBboxOverlay.tsx`** — Bbox drawing + lesion badges + highlight mode.
- **`components/LesionXaiCarousel.tsx`** — Per-lesion cards (model + Grad-CAM). Crop and heatmap panels render as **uniform 1:1 squares** (`aspectRatio: 1`, `resizeMode="contain"`) so the full preprocessed `IMG_SIZE × IMG_SIZE` tensor is visible end-to-end with no edge crop. No baked-in caption strip, no redundant prediction chip below the heatmap (the diagnosis card at the top of each slide is the single source of truth).
- **`lib/bboxDedupe.ts`** — Client-side bbox dedupe via **soft containment** (`bboxSoftContains`, threshold 0.85 — server also dedupes), including suppression of giant aggregate containers that cover multiple smaller lesions.

### Backend Node (`xai-skin-backend/`)

- **`routes/scanSessions.js`** — `POST /scan-sessions` (multer upload → Flask `scan-multi` → save crops/overlays → return `originalImageUrl` + `lesions[].cropUrl/overlayUrl`); `GET /scan-sessions[/:id]`; **`PATCH /scan-sessions/:id`** updates only user-editable metadata (`title`, `description`, `location`, `notes`); `DELETE /scan-sessions/:id` removes a session and related assets.
- **`models/ScanSession.js`** — Adds optional user metadata fields (`title`, `description`, `location`, `notes`) alongside the analysis result. Title is preferred by the app's history card label; falls back to a label derived from the top diagnosis.
- **`routes/lesions.js` + `models/Lesion.js`** — Persists saved lesion records, including region-level fields (`cropUrl`, `overlayUrl`) when saving from a scan session.

### Model server (`model-server/`)

- **`routes/scan.py`** — `/scan-multi` pipeline (enhance for camera vs gallery, detect, **dedupe boxes**, classify, Grad-CAM, annotated canvas). Also hosts **`POST /detect-fast`** (detector-only, used by mobile Live mode; ~320 px max input, normalized 0..1 bbox coords against the uploaded reticle-crop frame). Bench script: `model-server/scripts/bench_detect_fast.py`; pytest: `model-server/tests/test_detect_fast.py`.
- **`services/bbox_dedupe.py`** — Soft-containment dedupe: drop giant aggregate containers that cover multiple smaller boxes, then drop a box when ≥ `SOFT_CONTAINMENT_THRESHOLD` (0.85) of its area lies inside a larger box. Same logic mirrored client-side in `MyApp/lib/bboxDedupe.ts`. Used by both `/scan-multi` and the upcoming `/detect-fast`.

## Conventions

- **UI:** Plum/rose floral-clinical palette from **`theme.ts`** only.
- **Scan UX:** Lesion chips + carousel stay in sync with bbox highlight; loading uses themed skeleton (`ScanReviewLoading`) and overlay images show loading feedback before render. Grad-CAM crop/overlay panels render the **full** image (`resizeMode="contain"`), never `cover`-cropped — do not change this to `cover`; users must see the entire crop/heatmap edge-to-edge.
- **Live UX:** Detection is always limited to the centered 220 px reticle. Each detected bbox shows a colored class+conf chip; a top-of-screen pill always reports state (`Scanning…` vs `Lesion Detected! (N)`). Do not project live boxes onto the full preview — coords are normalized against the reticle crop only.
- **History UX:** History is scan-first. Each scan can be named/described/located via the `EditScanModal` (`PATCH /scan-sessions/:id`); the card label prefers the user-set title, otherwise it derives one from the top diagnosis (or "No lesion detected" / "Skin scan"). Specific regions can still be saved as tracked lesions from the scan detail or region modal.
- **Bbox dedupe:** Client + server use soft containment (≥85 % of inner area inside outer ⇒ drop inner), plus giant aggregate-container suppression so whole-image detections do not replace multiple lesion boxes. Don't tighten this back to strict containment; detector edges wobble.
- **Tests (app):** Run from `MyApp/` (no root `package.json`): `npm test` (Jest). Unit tests cover bbox helpers, soft-containment dedupe, image-preview-frame math, API media URL resolution, the reticle→photo-pixel mapping (`reticleCropInPhotoPx`), and the `useLiveDetect` hook (response parsing, in-flight backpressure, 2-failure offline rule).
- **Tests (model server):** Run from repo root with the project venv: `pytest model-server/tests`. `test_detect_fast.py` exercises the detector-only endpoint.
- **Reticle crop:** Never feed layout coordinates (e.g., 220 px reticle origin in a 393×852 layout) to `ImageManipulator.crop` — it expects **source-photo pixels**. Always route through `reticleCropInPhotoPx(layoutW, layoutH, photo.width, photo.height, RETICLE_SIZE)`. This bit us once (haiku-shipped commit `1a9467a2`, fixed in `11b96141`).

## Out of scope in this README

- Full route list, DB schemas, and CI: open the listed files or `models/` / `routes/` when implementing features.
- **docs/** may contain extra design notes; this README is the agent entry point.

## Suggested agent workflow

1. Confirm which layer the task touches (app vs Node vs Flask).
2. Open only the **Key files** above plus the specific route/model you need.
3. After API or pipeline changes, grep for callers (`scan-sessions`, `scan-multi`, `analyzeImage`, `updateSession`) instead of listing the whole tree.
4. When changing dedupe behaviour, update **both** `MyApp/lib/bboxDedupe.ts` and `model-server/services/bbox_dedupe.py`, plus the tests in `MyApp/__tests__/bboxDedupe.test.ts`.
