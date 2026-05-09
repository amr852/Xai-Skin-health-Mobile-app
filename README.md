# Xai Skin Health — monorepo

**For AI coding agents:** Read this file first. It summarizes architecture, runbooks, and where to edit code so you do not need to scan the entire repository for routine tasks.

## What this is

- **MyApp/** — React Native (Expo SDK 54) mobile client: skin photo capture, multi-lesion scan UI, history, auth.
- **xai-skin-backend/** — Node.js (Express) + MongoDB: auth, lesion CRUD, **scan session** orchestration. Receives uploads and calls the Python model server.
- **model-server/** — Flask app: YOLO-style detector → per-crop classifier → Grad-CAM; returns boxes, diagnoses, crops, overlays. Nested boxes are deduped **before** classification (`services/bbox_dedupe.py`, used from `routes/scan.py`).

End-to-end scan: **App** `POST /scan-sessions` (multipart image) → **Node** persists session, forwards to **Flask** `POST /scan-multi` → JSON back with `lesions[]` (bbox, diagnosis, `crop_b64` / `overlay_b64` stored as files in Node).

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

- **`app/(tabs)/camera.tsx`** — Scan flow: camera, review, analysis hook, bbox overlay, XAI carousel, loading.
- **`hooks/useLesions.ts`** — `analyzeImage` → `/scan-sessions`; types for lesions / analysis.
- **`lib/api.ts`** — API base URL resolution (`EXPO_PUBLIC_API_URL`, Metro host, emulator defaults).
- **`constants/theme.ts`** — **Single source for colors/spacing** (`C`, `Radius`, `Overlay`, etc.). Do not hardcode plum/rose hex in UI; use tokens.
- **`components/ImageWithBboxOverlay.tsx`** — Bbox drawing + lesion badges + highlight mode.
- **`components/LesionXaiCarousel.tsx`** — Per-lesion cards (model + Grad-CAM).
- **`lib/bboxDedupe.ts`** — Client-side nested-bbox dedupe (backup; server also dedupes).

### Backend Node (`xai-skin-backend/`)

- **`routes/scanSessions.js`** — `POST /scan-sessions`: multer upload, calls Flask `scan-multi`, saves crops/overlays, returns `originalImageUrl`, `lesions` with `cropUrl` / `overlayUrl`.

### Model server (`model-server/`)

- **`routes/scan.py`** — `/scan-multi` pipeline (enhance for camera vs gallery, detect, **dedupe boxes**, classify, Grad-CAM, annotated canvas).

## Conventions

- **UI:** Plum/rose floral-clinical palette from **`theme.ts`** only.
- **Scan UX:** Lesion chips + carousel stay in sync with bbox highlight; loading uses themed skeleton (`ScanReviewLoading`).
- **Tests (app):** `MyApp/` → `npm test` (Jest); bbox helpers have unit tests under `MyApp/__tests__/`.

## Out of scope in this README

- Full route list, DB schemas, and CI: open the listed files or `models/` / `routes/` when implementing features.
- **docs/** may contain extra design notes; this README is the agent entry point.

## Suggested agent workflow

1. Confirm which layer the task touches (app vs Node vs Flask).
2. Open only the **Key files** above plus the specific route/model you need.
3. After API or pipeline changes, grep for callers (`scan-sessions`, `scan-multi`, `analyzeImage`) instead of listing the whole tree.
