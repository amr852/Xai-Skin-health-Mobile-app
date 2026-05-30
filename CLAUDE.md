# CLAUDE.md — Xai Skin Health monorepo

Agent entry point. Read README.md for human-facing detail; this file is the rules + pitfalls digest.

## Architecture (3 layers)

- **MyApp/** — React Native + Expo SDK 54 (mobile client).
- **xai-skin-backend/** — Node.js + Express + MongoDB. Auth, lesion CRUD, scan-session orchestration. Forwards uploads to Flask.
- **model-server/** — Flask + Python. YOLOv12n detector → **hierarchical** EfficientNet-B0 classifier (primary benign|malignant → specialist 5-class benign OR 2-class malignant) → Grad-CAM on the specialist head. Also hosts `/detect-fast` (detector-only, 3 fps live mode).

End-to-end scan path:
`App → POST /scan-sessions (Node, multipart) → POST /scan-multi (Flask) → JSON{lesions[{primary, specialist, ...}], crop_b64, overlay_b64} → Node persists crops/overlays → App renders.`

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

### Grad-CAM target = specialist model
For each crop, `services/classifier.py::HierarchicalClassifier.predict` returns `specialist_model_key ∈ {"benign","malignant"}` and `specialist_pred_idx`. `services/explainer.py::overlay_for_lesion` MUST resolve the model + target layer from that key (`features[-1]` of EfficientNet-B0). Never run Grad-CAM on the primary head — the user needs to see *why* the subtype was chosen, not just "is it bad".

### Hierarchical class label maps
`PRIMARY_CLASSES = ["benign","malignant"]`, `BENIGN_CLASSES = ["akiec","bkl","df","nv","vasc"]`, `MALIGNANT_CLASSES = ["bcc","mel"]` (HAM `dx` codes; sorted at train time). All env-overridable. Order matters — checkpoints carry no embedded labels, so re-order via env vars only after confirming with a known-label test image. EfficientNet-B0 needs ImageNet normalization (`NORMALIZE_INPUT=1`, now the default).

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
- `components/LesionXaiCarousel.tsx` — per-lesion cards. **`resizeMode="contain"`** (see hard rules).

### Backend Node (`xai-skin-backend/`)
- `routes/scanSessions.js` — POST/GET/PATCH/DELETE. Multer upload → Flask `/scan-multi` → save crops/overlays.
- `models/ScanSession.js` — user metadata fields (title, description, location, notes).
- `routes/lesions.js` + `models/Lesion.js` — saved lesion records with `cropUrl`/`overlayUrl`.

### Model server (`model-server/`)
- `routes/scan.py` — `/scan-multi` full pipeline + `/detect-fast` (detector only, ~320 px max input, normalized 0..1 boxes).
- `services/classifier.py` — `HierarchicalClassifier`: loads three EfficientNet-B0 heads at import time; routes primary verdict to benign/malignant specialist; exposes `target_layers` for Grad-CAM.
- `services/explainer.py` — `overlay_for_lesion(crop_pil, classifier_result)` resolves the specialist model+layer and produces the heatmap PNG (base64).
- `services/bbox_dedupe.py` — soft-containment server-side.
- `config.py` — `PRIMARY_WEIGHTS / BENIGN_WEIGHTS / MALIGNANT_WEIGHTS` paths + `PRIMARY_CLASSES / BENIGN_CLASSES / MALIGNANT_CLASSES` label maps + `LABEL_DISPLAY` + `SEVERITY` map.
- Bench: `scripts/bench_detect_fast.py`. Tests: `tests/test_detect_fast.py`, `tests/test_hierarchical_classifier.py`, `tests/test_config.py`.

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
