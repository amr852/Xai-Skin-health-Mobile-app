# CLAUDE.md — Xai Skin Health monorepo

Agent entry point. Read README.md for human-facing detail; this file is the rules + pitfalls digest.

## Architecture (3 layers)

- **MyApp/** — React Native + Expo SDK 54 (mobile client).
- **xai-skin-backend/** — Node.js + Express + MongoDB. Auth, lesion CRUD, scan-session orchestration. Forwards uploads to Flask.
- **model-server/** — Flask + Python. YOLOv12n detector → **flat ResNet50** classifier (single 7-class HAM10000 head: `AK BCC BKL DF MEL NV VASC`, `config.ALL_CLASSES`) → Grad-CAM on `model.layer4[-1]`. Current default on `experiment/resnet50-default` (replaces the prior hierarchical EfficientNet-B0 primary→specialist stack — `FlatClassifier` keeps `primary`/`specialist` compat keys so the rest of the pipeline + frontend types are unchanged). Also hosts `/detect-fast` (detector-only, 3 fps live mode).

End-to-end scan path:
`App → POST /scan-sessions (Node, multipart) → POST /scan-multi (Flask) → JSON{lesions[{primary, specialist, ...}], whole_image{...}, crop_b64, overlay_b64} → Node persists crops/overlays → App renders per-lesion carousel + whole-image XAI card.`

Live mode path:
`App (3 fps reticle crop) → POST /detect-fast (Flask, detector only) → boxes[] normalized 0..1 against uploaded crop.`

## Commands

| Layer | Cwd | Cmd | URL |
|---|---|---|---|
| Mobile | `MyApp/` | `npx expo start` | Metro |
| Mobile tests | `MyApp/` | `npm test` | — |
| Backend | `xai-skin-backend/` | `npm start` | http://localhost:3000 |
| Model | `model-server/` | Flask entry | http://localhost:5000 |
| Model tests | repo root | `pytest model-server/tests` | — |

**No root `package.json`** — Jest is run from `MyApp/`, not repo root. Same for `tsc`.

Env: `EXPO_PUBLIC_API_URL`, `MODEL_SERVER_URL` (default `http://localhost:5000`), `MONGODB_URI` (default local).

## Hard rules (do not violate)

### Reticle crop coordinate space
`ImageManipulator.crop` expects **source-photo pixels**, not layout coords. Layout reticle is 220 px in screen space, but the photo is e.g. 3024×4032 raw-sensor px. Always route through `MyApp/lib/bboxLayout.ts::reticleCropInPhotoPx(layoutW, layoutH, photoW, photoH, RETICLE_SIZE)`. It inverts the camera preview's aspect-fill (cover) scale and handles raw-sensor landscape vs portrait layout. **History:** Haiku 4.7 shipped a bug here in `1a9467a2` (crop landed top-left of photo, not reticle); fixed in `11b96141`.

### Live detection scope = reticle only
`/detect-fast` receives the reticle crop. Server bboxes are normalized 0..1 against that crop. **Never project live boxes onto the full preview** — only onto the centered 220 px reticle box. Capture also crops to the reticle before `/scan-sessions`.

### Bbox dedupe is soft, not strict
Client (`MyApp/lib/bboxDedupe.ts`) + server (`model-server/services/bbox_dedupe.py`) both use **soft containment** at threshold 0.85: drop a box when ≥85% of its area falls inside a larger box. Also suppress giant aggregate containers covering multiple smaller lesions. Detector edges wobble — strict containment under-dedupes. Update both files + `__tests__/bboxDedupe.test.ts` together.

### XAI image rendering = contain, never cover
`LesionXaiCarousel.tsx` crop + heatmap panels use `resizeMode="contain"`. User requirement: full image visible edge-to-edge. Do not "fix" to `cover`.

### Theme tokens only
All UI color/spacing from `MyApp/constants/theme.ts` (`C`, `Radius`, `Overlay`, `Shadow`, `FontFamily`). Do not hardcode plum/rose hex.

### Auth screen back button
Login/register top-bar uses `router.replace('/(auth)/welcome')`, **not** `router.back()`. Intentional UX.

### Grad-CAM target = ResNet50 layer4[-1], run per-image not per-canvas
`services/explainer.py::_get_target_layer` resolves `model.layer4[-1]` (final 2048-ch bottleneck, pre-avgpool) for torchvision ResNet. `overlay_for_lesion(pil_image, classifier_result)` is generic — `routes/scan.py` calls it **twice**: once per lesion on the **padded crop** (`raw_crop`, so the heatmap aligns with `crop_b64`) using that lesion's own `diag`, and once on the **full raw image** (`raw_pil`) using the separately-computed `whole_diag` for `whole_image.overlay_b64`. Never pass the full image when explaining a crop's diagnosis (heatmap won't align with what's shown) — fixed in `809` after Haiku shipped that bug.

### Flat classifier label map
`config.ALL_CLASSES = ["AK","BCC","BKL","DF","MEL","NV","VASC"]` (HAM `dx` codes, order matches the trained `best_resnet50.pth` checkpoint — checkpoints carry no embedded labels, only re-order via env vars after confirming with a known-label test image). `FlatClassifier.predict` derives a coarse `primary: benign|malignant` from `MALIGNANT_LABELS = {"MEL","BCC"}` for the UI banner, and emits `specialist`/`specialist_model_key="flat"`/`specialist_pred_idx` compat keys so `explainer.py` and the frontend (`primary`/`specialist` typed fields) need no changes. ResNet50 needs ImageNet normalization (`IMAGENET_MEAN/STD`, always on).

## Key files

### Mobile
- `app/(tabs)/camera.tsx` — scan flow. Live overlays inside reticle, class+conf chip per bbox, top status pill (`Scanning…` ↔ `Lesion Detected! (N)`). Shutter calls `cropToReticle()` then `/scan-sessions`.
- `hooks/useLiveDetect.ts` — 3 fps loop, AppState pause, 2-failure offline banner, abort-on-disable. Crops to reticle via `reticleCropInPhotoPx`. Tests mock `expo-image-manipulator` (coord math is covered by `bboxLayout.test.ts`).
- `lib/bboxLayout.ts` — `containLayout`, `bboxToOverlayRect`, `reticleCropInPhotoPx`.
- `lib/imageSharpness.ts` — Laplacian variance blur gate. `LAPLACIAN_VARIANCE_THRESHOLD = 15` (lenient). Applied to both camera + gallery inputs in `camera.tsx::ensureSharpEnough`.
- `lib/bboxDedupe.ts` — soft-containment dedupe mirror of server.
- `app/(tabs)/history.tsx` — scan-first history; `EditScanModal` patches title/description/location.
- `app/scan-session/[id].tsx` — full scan report; per-region save.
- `hooks/useLesions.ts` — `analyzeImage → /scan-sessions`.
- `hooks/useScanSessions.ts` — fetch/delete/update sessions.
- `lib/api.ts`, `lib/mediaUrl.ts` — URL resolution for physical devices.
- `components/ImageWithBboxOverlay.tsx` — static bbox draw + lesion badges.
- `components/LesionXaiCarousel.tsx` — per-lesion cards (own `crop_b64`/`overlay_b64`, independently classified — never synced across lesions or with `wholeImage`), **`resizeMode="contain"`** (see hard rules), plus a 3rd "WHOLE IMAGE · XAI" card below the carousel rendering `wholeImage.overlayUrl` (true full-photo Grad-CAM from `whole_overlay_b64`, distinct from the per-region annotated canvas). No `compositeUrl` prop — removed `843` as a mislabeled duplicate ("Full capture · Grad-CAM" was actually the per-region painted canvas, not a real whole-image heatmap).

### Backend Node (`xai-skin-backend/`)
- `routes/scanSessions.js` — POST/GET/PATCH/DELETE. Multer upload → Flask `/scan-multi` → save crops/overlays.
- `models/ScanSession.js` — user metadata fields (title, description, location, notes).
- `routes/lesions.js` + `models/Lesion.js` — saved lesion records with `cropUrl`/`overlayUrl`.

### Model server (`model-server/`)
- `routes/scan.py` — `/scan-multi` full pipeline (whole-image classify+Grad-CAM, then per-lesion: detect → crop → classify → Grad-CAM-on-crop, each independent) + `/detect-fast` (detector only, ~320 px max input, normalized 0..1 boxes).
- `services/classifier.py` — `FlatClassifier`: loads single ResNet50 head (`config.MODEL_WEIGHTS`, default `weights/best_resnet50.pth`) at import time; flat 7-class softmax + 4-flip TTA; emits `primary`/`specialist` compat dict for the rest of the pipeline.
- `services/explainer.py` — `GradCAMExplainer.overlay_for_lesion(pil_image, classifier_result)` — generic, runs Grad-CAM on whatever image it's given (crop or full) using that image's own classifier result; resolves target layer via `_get_target_layer` (`layer4[-1]` for ResNet).
- `services/bbox_dedupe.py` — soft-containment server-side.
- `config.py` — `MODEL_WEIGHTS`/`MODEL_ARCH="resnet50"` + `ALL_CLASSES` flat label map + `LABEL_DISPLAY` + `SEVERITY` + `MALIGNANT_LABELS` + `LESION_CROP_PADDING`/`LESION_CROP_MIN_MARGIN_PX`.
- Bench: `scripts/bench_detect_fast.py`, `scripts/bench_resnet50.py` (also `bench_effnetb4.py`/`bench_mobilevit.py` from earlier A/B experiments — see `S144`/`789`). Tests: `tests/test_detect_fast.py`, `tests/test_config.py`, `tests/test_hierarchical_classifier.py` (misnamed — actually exercises `FlatClassifier`, skips if weights missing), `tests/test_bbox_dedupe.py`.

## Latency / production notes

`/detect-fast` dev-box p50 ≈ 257 ms on CPU YOLOv12n (spec 150 ms). Client 3 fps cap absorbs it. Cold first-request RTT ~1280 ms; warm 286–333 ms over LAN. Production scale needs GPU or quantized model.

## Testing

- `MyApp/` Jest covers: bbox helpers, soft-containment dedupe, image-preview-frame math, API media URL, `reticleCropInPhotoPx`, `useLiveDetect` response parsing / in-flight backpressure / 2-failure offline rule. 28 tests, 5 suites.
- `model-server/tests/test_detect_fast.py` exercises detector-only endpoint.
- Run `npm test` from `MyApp/`, not repo root. Jest CLI uses `--verbose`, not `-v`.

## Known TypeScript drift (pre-existing, not blockers)

- `expo-camera` newer `takePictureAsync` types return `PictureRef` — code uses `(photo as any).uri` to access the URI. Real runtime works.
- `app/(tabs)/history.tsx` line ~344, 1066 — bbox undefined narrowing + comparison mismatch.
- `components/ScanReviewLoading.tsx` — missing style props.
- `__tests__/useLiveDetect.test.ts` — missing `@types/react-test-renderer` dev dep.

None of these block builds; address only if touching the file.

## Past gotchas worth remembering

- **Auth back button** intentional `router.replace`, not history pop (see hard rules).
- **`/detect-fast` p50 = 257 ms** above the 150 ms target — fine on dev; flag for prod.
- **ImageManipulator coord space** — see hard rules. Single biggest footgun in this repo.
- **XAI `cover` vs `contain`** — historical commit shipped `cover`; user explicitly required `contain`.

## Workflow for new tasks

1. Identify layer (mobile / Node / Flask).
2. Open Key files for that layer first. Do not list the tree.
3. After API/pipeline changes, grep callers: `scan-sessions`, `scan-multi`, `analyzeImage`, `updateSession`, `detect-fast`.
4. Dedupe changes touch **both** client + server + tests.
5. Reticle/crop changes touch **both** `useLiveDetect.ts` capture flow + `camera.tsx::cropToReticle` + `bboxLayout.test.ts`.
6. Verify with `npm test` from `MyApp/` before declaring done.
