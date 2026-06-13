# Xai Skin Health — monorepo

**For AI coding agents:** Read this file first. It summarizes architecture, runbooks, and where to edit code so you do not need to scan the entire repository for routine tasks.

## What this is

- **MyApp/** — React Native (Expo SDK 54) mobile client: skin photo capture, multi-lesion scan UI, history, auth.
- **xai-skin-backend/** — Node.js (Express) + MongoDB: auth, lesion CRUD, **scan session** orchestration (incl. user-editable scan metadata). Receives uploads and calls the Python model server.
- **model-server/** — Flask app: YOLOv12n detector → flat **ResNet50** 7-class classifier (`AK BCC BKL DF MEL NV VASC`, `config.ALL_CLASSES`; `experiment/resnet50-default` branch — replaces the prior hierarchical EfficientNet-B0 primary→specialist stack, `FlatClassifier` keeps `primary`/`specialist` compat keys) → Grad-CAM on `model.layer4[-1]`; returns boxes, diagnoses, crops, overlays, **plus a separate whole-image diagnosis+heatmap** (`whole_image{...}`). Aggregate whole-image boxes and nested boxes are deduped **before** classification using **soft containment** — see `services/bbox_dedupe.py`, used from `routes/scan.py`.

End-to-end scan: **App** `POST /scan-sessions` (multipart image) → **Node** persists session, forwards to **Flask** `POST /scan-multi` → JSON back with `lesions[]` (bbox, diagnosis, `crop_b64` / `overlay_b64` stored as files in Node). History is **scan-first** (every scan is shown, named, and editable); users can also save specific regions from a scan as tracked lesion records.

**Live mode (shipped)**: the camera screen runs real-time detection by default — the app streams ~320 px frames at 3 fps from the centered 220 px reticle to Flask **`POST /detect-fast`** (detector-only, no classifier, no Grad-CAM) and overlays bboxes on the live preview. Each bbox renders with a class+confidence chip (e.g. `Basal cell carcinoma 0.94`), and a top-of-screen status pill shows `Scanning… place lesion inside the box` while idle, switching to red `Lesion Detected! (N)` when detections are present. Reticle is mapped through the camera preview's aspect-fill (cover) scale via `reticleCropInPhotoPx` so the crop hits the right region in source-photo pixels (not layout px). Live frames are never persisted; tapping the shutter captures a fresh hi-res still, crops it to the same reticle, and runs the full `/scan-sessions` pipeline. Plan: [`docs/superpowers/plans/2026-05-15-unified-realtime-lesion-detection.md`](docs/superpowers/plans/2026-05-15-unified-realtime-lesion-detection.md). Tracker: [`planning/realtime-lesion-detection-plan.md`](planning/realtime-lesion-detection-plan.md). Spec: [`planning/realtime-lesion-detection.md`](planning/realtime-lesion-detection.md). Dev-box latency note: p50 ≈ 257 ms on CPU YOLOv12n — above 150 ms spec; client 3 fps cap absorbs it. Production needs GPU/quant.

## Run it on your own machine (full local setup)

The app has **three services** that run at the same time: the **MongoDB** database, the
**Node API** (port 3000), and the **Flask model server** (port 5000). The **Expo app** is the
fourth process. Start them in this order: Mongo → Flask → Node → Expo.

```
                 ┌─────────────┐  port 3000   ┌──────────────┐  port 5000   ┌──────────────┐
  Expo phone ───▶│  Node API   │─────────────▶│ Flask models │              │   MongoDB    │
   (Metro)       │ (Express)   │              │ YOLO+ResNet50│              │  port 27017  │
                 └─────────────┘◀── stores ───┴──────────────┘              └──────▲───────┘
                        └────────────────── reads/writes users + scans ────────────┘
```

### 0. Prerequisites (install once)

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** + npm | 18 LTS or newer | `node -v` |
| **Python** | 3.10 – 3.12 | `python --version` |
| **MongoDB** | 6.x or newer (or Docker, or a free Atlas cluster) | see step 1 |
| **Expo Go** app | latest | install on your phone from the App Store / Play Store |

Clone the repo, then open **three terminals** (one per service).

### 1. Start MongoDB

Pick **one** of these — the app just needs a reachable MongoDB at `mongodb://localhost:27017`.

**Option A — Docker (easiest, no install):**
```bash
docker run -d --name xai-mongo -p 27017:27017 -v xai-mongo-data:/data/db mongo:7
```

**Option B — Local recommended install:** install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
On Windows it runs as a service automatically. On macOS: `brew install mongodb-community && brew services start mongodb-community`. On Linux: `sudo systemctl start mongod`.

**Option C — MongoDB Atlas (cloud, free tier):** create a cluster, copy its connection string,
and set it as `MONGODB_URI` in the backend `.env` (step 3). Nothing to run locally.

> Default database name is `xai-skin-health` — it is created automatically on first write.

### 2. Start the Flask model server (port 5000)

```bash
cd model-server
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
python app.py            # serves http://localhost:5000
```

First boot downloads/loads the YOLOv12n detector + ResNet50 classifier weights
(`weights/best_resnet50.pth` is committed). Confirm it's healthy:

```bash
curl http://localhost:5000/health
# {"ok":true,"model_arch":"resnet50","num_classes":7,"mongo":true,...}
```

### 3. Start the Node API (port 3000)

```bash
cd xai-skin-backend
cp .env.example .env      # then edit if needed (see vars below)
npm install
npm run seed              # creates the demo login  patient@skin.com / 123456  (see below)
npm start                 # serves http://localhost:3000
```

`.env` variables (defaults work for an all-local setup):

| Var | Default | Purpose |
|-----|---------|---------|
| `MONGODB_URI` | `mongodb://localhost:27017/xai-skin-health` | database connection (use your Atlas string for Option C) |
| `MODEL_SERVER_URL` | `http://localhost:5000` | where the Flask model server lives |
| `JWT_SECRET` | dev placeholder | **change for any non-local use**; keep it stable or tokens invalidate on restart |

### 4. Start the Expo mobile app

```bash
cd MyApp
npm install
npx expo start
```

Scan the QR code with **Expo Go** (or press `a` / `i` for an emulator). Then sign in with the
demo account below.

**Physical phone on Wi-Fi?** The phone must reach your computer's Node API. Find your machine's
LAN IP (`ipconfig` on Windows / `ifconfig` on macOS) and set it before `expo start`:

```bash
# Windows PowerShell
$env:EXPO_PUBLIC_API_URL="http://192.168.x.x:3000"; npx expo start
# macOS / Linux
EXPO_PUBLIC_API_URL="http://192.168.x.x:3000" npx expo start
```

If detection/scan requests time out from a physical device, Windows Firewall may be blocking
ports 3000/5000 — run `model-server/scripts/open_dev_firewall.ps1` (as admin) to open them.

### Demo login

A ready-to-use patient account is seeded by `npm run seed`:

```
Email:    patient@skin.com
Password: 123456
```

The password is 6 characters because the app's login form requires at least 6 (`MyApp/lib/validators.ts`, `PASSWORD_MIN = 6`); a shorter one is rejected before the request reaches the API.

Re-running `npm run seed` is safe — it resets that account's password back to `123456`.

### Quick reference

| Layer | Directory | Command | URL |
|--------|-----------|---------|-----|
| Database | — | `docker run … mongo:7` (or local/Atlas) | `mongodb://localhost:27017` |
| Models | `model-server/` | `python app.py` | **http://localhost:5000** |
| API | `xai-skin-backend/` | `npm start` (seed first: `npm run seed`) | **http://localhost:3000** |
| Mobile | `MyApp/` | `npx expo start` | Metro → Expo Go |

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
- **`components/LesionXaiCarousel.tsx`** — Per-lesion cards (model + Grad-CAM), each independently classified — own `crop_b64`/`overlay_b64`/diagnosis from `body.lesions[i]`, never synced across lesions or with the whole-image result. Crop and heatmap panels render with `resizeMode="contain"` so the full image is visible end-to-end with no edge crop. Below the carousel: a 3rd **"WHOLE IMAGE · XAI"** card showing the true full-photo Grad-CAM (`wholeImage.overlayUrl` ← `whole_overlay_b64`, computed on the raw uncropped image — distinct from the per-region annotated canvas), then a "Full capture · detected regions" bbox-overlay block. No `compositeUrl` prop (removed — was a mislabeled duplicate showing the per-region painted canvas as if it were a whole-image heatmap).
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
