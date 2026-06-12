# IMPLEMENTATION LOG — Xai Skin Health

Date: 2026-06-11 · Branch: `experiment/effnetb4-default`
Companion to `PROJECT_REVIEW_AND_PLAN.md` (audit + checklist). Every change below was made
after the audit, verified by the test runs in §Verification.

---

## 1. model-server/app.py

**What changed**
- Added `MAX_CONTENT_LENGTH` (env `MAX_UPLOAD_MB`, default 25 MB) so oversized uploads are
  rejected with 413 before consuming pipeline resources.
- Mongo client now uses `serverSelectionTimeoutMS` (env `MONGO_SELECTION_TIMEOUT_MS`,
  default 5000) instead of pymongo's 30 s default; client stored in `app.config["MONGO_CLIENT"]`.
- New `GET /health` endpoint: `{ok, model_name, model_arch, num_classes, img_size, tta, mongo}` —
  `mongo` is a live ping result.
- JSON error handlers for 404 / 405 / 413 / 500 (previously Flask HTML error pages).

**Why** — Audit items B1, B2, B3, B8. Clients are programs; health checks and structured errors
were missing on the Flask side (Node already had both).

**Affects** — backend, reliability, deployment readiness. No frontend impact.
**Risks** — None meaningful. 25 MB cap is far above any phone JPEG; env-overridable.
**Follow-up** — Point any infra monitoring at `GET /health` (lighter than legacy `GET /`).

## 2. model-server/routes/scan.py

**What changed**
- Stage timing instrumentation in `/scan-multi`: `load_enhance`, `detect`, `whole_classify`,
  `whole_gradcam`, `lesions` (full per-lesion loop), `annotate_encode`, `persist`, `total`.
  One structured log line per request; breakdown returned additively as `timings_ms`.
- Response now includes `model_name` (additive) — single source of truth for the deployed arch.
- Annotated canvas: was `cv2.imwrite` to disk then re-`open()`+read for base64. Now encoded
  once in memory (`cv2.imencode`), same bytes written to disk (filename still referenced by
  the Mongo session doc) — one encode, one write, zero reads.
- Flask-side Mongo `insert_one` is now best-effort (try/except + warning log). Node keeps the
  authoritative `ScanSession` copy, so a down Mongo no longer 500s a scan **after** all
  inference succeeded. `session_id` is `null` in that case (it was already nullable for
  anonymous scans, so no client change needed).
- Stale module docstring fixed ("MobileNetV2" → arch-agnostic).
- Removed unused imports (`save_image`, `to_base64`, `center_fallback_crop`).

**Why** — Audit items B4, B6, B7, B9, B10. Latency was unattributable before; now measured,
not guessed.

**Affects** — backend, latency (small: removes a PNG disk read per scan), reliability,
maintainability. Response format: **additive only** — verified Node consumers
(`scanSessions.js`, `lesions.js`) ignore unknown fields.
**Risks** — Behavior change when Mongo is down: scan succeeds with `session_id: null` instead
of failing. Intentional and documented (plan §9).
**Measured (smoke test, cold CPU, real 2-lesion image)** —
`timings_ms = {load_enhance: 188, detect: 814, whole_classify: 2265, whole_gradcam: 1811, lesions: 11837, annotate_encode: 32, persist: 0, total: 16951}`.
Per-lesion loop (classify TTA + Grad-CAM ×2 lesions) dominates → optimization target is model
compute (TTA batching / GPU), not I/O. No fabricated before/after numbers; the instrument now
exists to measure any future change.

## 3. model-server/helpers.py

**What changed** — `save_enhanced_pair_from_upload` rewritten to run fully in memory:
- Removed the `NamedTemporaryFile` write + re-read (was used only for `is_blurry`, which
  accepts an ndarray directly).
- Removed the final `Image.open(enhanced_file)` re-read; `img_pil` now built from the in-memory
  enhanced array (`cv2.cvtColor` BGR→RGB → `Image.fromarray`).
- `orig_bgr` taken as a copy before enhancement instead of a second PIL→BGR conversion.
- The two persisted files (`orig_*`, `enh_*`) are still written identically — legacy routes and
  Mongo records reference those names.
- Removed now-unused `tempfile` import.

**Why** — Audit item B5: 4 disk round-trips per camera scan reduced to 2 writes, 0 reads.

**Affects** — backend, latency, maintainability. Used by `/scan-multi` (camera source) and all
legacy routes.
**Risks (flagged for manual review)** —
1. `is_blurry` previously scored a JPEG-re-encoded temp file; now scores the raw array. More
   correct/consistent, but borderline images near `BLUR_THRESHOLD=20.0` could flip
   classification. The mobile client already gates blur at capture time.
2. `img_pil` (display/detector image) previously carried one extra JPEG compression cycle from
   the disk re-read; now it is lossless. Detector input is marginally cleaner — same image,
   fewer artifacts. Classifier input is unaffected (it uses `raw_pil`, untouched path).

## 4. xai-skin-backend/routes/scanSessions.js

**What changed**
- `POST /scan-sessions` response now includes `model_name` (passthrough from Flask, additive).
- Per-request duration log line (`Node total ms` + Flask `timings_ms.total` when present).

**Why** — F5/B9 model-name chain; basic latency visibility at the Node hop.
**Affects** — backend, latency observability. Additive response field only.
**Risks** — None; field is `null` if Flask is older.

## 5. xai-skin-backend/routes/lesions.js

**What changed** — Removed 3 hardcoded `modelName: 'effnet_b0_hierarchical + YOLO (Grad-CAM)'`
strings (stale — that architecture is gone). Now derived once per request from `raw.model_name`
with generic fallback `'Lesion classifier + YOLOv12n (Grad-CAM)'`.

**Why** — Audit item B11. Users were shown a model that no longer exists.
**Affects** — backend, UI correctness (the string is stored in lesion records and displayed).
**Risks** — Existing saved records keep the old string (historical data, not rewritten).

## 6. MyApp/hooks/useLesions.ts

**What changed** — `analyzeImage` no longer hardcodes
`'EfficientNet-B0 hierarchical + YOLOv12n (Grad-CAM)'`; uses `body.model_name` from the Node
response (typed as optional on `ScanSessionCreateBody`) with the same generic fallback.

**Why** — F5. Completes the Flask → Node → app model-name chain.
**Affects** — frontend, UI correctness. **Risks** — None; fallback covers older backends.

## 7. MyApp/components/ScanReviewLoading.tsx

**What changed** — Added the two missing StyleSheet entries the JSX already referenced:
`elapsed` (hint-grey inline counter, de-emphasized vs. the stage text) and `subHint`
(centered, padded slow-scan explainer shown after 25 s).

**Why** — F1: 2 TS errors; the elapsed counter and slow-scan hint rendered with inherited/
unstyled text. Loading state is the most-watched screen in the app — now properly styled.
**Affects** — frontend, UI, TS health. **Risks** — None.

## 8. MyApp/app/(tabs)/history.tsx

**What changed**
- `mapped` in `LesionRegionsModal` annotated as `RegionView[]` — fixes the type-predicate pair
  of TS errors at line ~338.
- `listTab` literal annotation changed to a widening cast (`'sessions' as HistoryListTab`) so
  the intentionally-kept legacy lesions branch stays type-valid (fixes TS2367 at ~1102).
- Removed unused `useEffect` import and unused `addLesion` destructure (lint warnings).

**Why** — F2, F3 + lint hygiene. Zero runtime behavior change.
**Affects** — frontend TS/lint health only.

## 9. MyApp/app/(tabs)/camera.tsx

**What changed** — `Array<T>` → `T[]` for the `liveBoxes` annotation (lint rule). Type-only.

## 10. MyApp/app/scan-session/[id].tsx

**What changed** — Escaped apostrophe (`it's` → `it&apos;s`) in rename-hint text — was the one
lint **error** in the repo. Rendered text unchanged.

## 11. MyApp/types/react-test-renderer.d.ts (new)

**What changed** — Minimal ambient module declaration for `react-test-renderer` (namespace +
`create`/`act`/`ReactTestRenderer`, exactly the surface `__tests__/useLiveDetect.test.ts` uses).

**Why** — F4 (TS7016) without adding an npm dependency for test-only typing.
**Risks** — If tests start using more of the API, extend the shim — or migrate to
`@testing-library/react-native` (recommended-next item).

---

## Verification (Phase 6) — commands actually run

| Check | Command (cwd) | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` (MyApp) | **PASS** — 0 errors (was 6 before changes) |
| Mobile tests | `npm test` (MyApp) | **PASS** — 5 suites, 28 tests |
| Lint | `npm run lint` (MyApp) | **PASS** — 0 errors, 6 warnings (was 1 error, 9 warnings; remaining warnings pre-existing in untouched code, see below) |
| Node tests | `npx jest` (xai-skin-backend) | **PASS** — 1 suite (`GET /health` via supertest; requires/parses `app.js` + all routers incl. edited ones) |
| Model tests | `python -m pytest tests -q` (model-server) | **PASS** — 20 passed (also passed pre-change baseline) |
| Flask startup | `python -c "from app import app; …"` test client | **PASS** — models load once at import; `/health` 200 with model info + `mongo: true` |
| Error handlers | test client | **PASS** — `POST /scan-multi` no file → 400 JSON; unknown path → 404 JSON; bad method → 405 JSON |
| End-to-end scan | test client POST real JPEG to `/scan-multi` | **PASS** — 200, 2 lesions, full legacy schema intact + `model_name`/`timings_ms` present, crop/overlay/whole-image b64 all produced |

**Remaining lint warnings (intentionally left):**
- `camera.tsx:393` exhaustive-deps `showAlert` — adding it changes effect re-run behavior on a
  prediction-critical effect; not a safe blind fix.
- `VitalCard.tsx` ×5 unused vars — untouched file, props may be part of a planned API; out of
  scope for this pass.

**Not run (documented):** `expo start` interactive bundling and a physical-device pass —
requires a device/emulator session. Manual verification steps are listed in
`PROJECT_REVIEW_AND_PLAN.md` consumers' guide below.

## How to verify manually

1. `model-server/`: start Flask → `GET http://localhost:5000/health` → expect `ok: true` + model info.
2. `xai-skin-backend/`: `npm start` → `GET http://localhost:3000/health` → `ok: true`.
3. `MyApp/`: `npx expo start` → log in → Scan tab → capture a lesion photo → review screen
   should show the loading shimmer with styled elapsed counter, then carousel; the session
   summary's model name should read "EfficientNet-B4 + YOLOv12n (Grad-CAM)" (this branch).
4. Kill Mongo, repeat a scan → scan should still succeed (Flask logs a persist warning).
5. POST `/scan-multi` without a file → 400 JSON; with a >25 MB file → 413 JSON.
