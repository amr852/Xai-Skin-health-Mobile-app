# PROJECT REVIEW AND PLAN — Xai Skin Health

Date: 2026-06-11 · Branch: `experiment/effnetb4-default` · Reviewer: Claude (full-stack audit)

This document is the Phase-1 audit required before any code changes. It maps the project,
lists findings per layer, and defines a prioritized, safe implementation checklist.
Status markers are updated as work completes: **Done / Partially done / Not done / Needs manual review**.

---

## 1. Folder / file map

```
Xai-Skin-health-Mobile-app/
├── MyApp/                        # React Native + Expo SDK 54 mobile client (expo-router)
│   ├── app/
│   │   ├── (auth)/               # welcome, login, register
│   │   ├── (tabs)/               # index (home), camera, history, profile
│   │   ├── scan-session/[id].tsx # full scan report
│   │   ├── notifications.tsx, modal.tsx, _layout.tsx
│   ├── components/
│   │   ├── ui/                   # AppButton, AppInput, AppAlert, Card, EmptyState, PageHeader, …
│   │   ├── LesionXaiCarousel.tsx # per-lesion XAI cards + whole-image XAI card
│   │   ├── ImageWithBboxOverlay.tsx, LesionFilterBar.tsx, ScanReviewLoading.tsx
│   │   ├── home/, vitals/, decor/, charts/
│   ├── hooks/                    # useLesions, useLiveDetect, useScanSessions, useAuth, …
│   ├── lib/                      # api.ts, bboxLayout.ts, bboxDedupe.ts, imageSharpness.ts, mediaUrl.ts, …
│   ├── constants/theme.ts        # full design-token system (C, Gradient, Overlay, Shadow, …)
│   ├── __tests__/                # 5 suites / 28 tests (bbox math, dedupe, media URL, live detect)
│   └── package.json              # jest, eslint (expo lint), tsc
│
├── xai-skin-backend/             # Node.js + Express + MongoDB (mongoose)
│   ├── app.js                    # CORS, morgan, mongo connect, global JSON error handler
│   ├── routes/                   # users (JWT auth+refresh), lesions, scanSessions, detectFast (proxy), health
│   ├── models/                   # User, Lesion, ScanSession
│   ├── middleware/verifyToken.js
│   └── __tests__/health.test.js  # supertest /health
│
└── model-server/                 # Flask + PyTorch
    ├── app.py                    # app factory; Mongo client; registers blueprints
    ├── config.py                 # env-driven: MODEL_ARCH=efficientnet_b4 (this branch), IMG_SIZE=380, labels
    ├── routes/scan.py            # /scan-multi (full pipeline), /detect-fast (detector only)
    ├── routes/legacy.py          # /, /analyze, /scan, /predict, /predict-xai, /images/<user>
    ├── services/                 # classifier (FlatClassifier), detector (YOLOv12n), explainer (Grad-CAM),
    │                             # preprocess (EXIF+ICC→sRGB), lesion_crop, bbox_dedupe
    ├── helpers.py                # upload IO + blur/low-light enhancement pipeline
    ├── image_quality.py          # Laplacian variance, brightness, enhancement filters
    ├── tests/                    # 20 tests (config, dedupe, detect-fast, classifier)
    └── weights/                  # best_resnet50.pth, last_effnetb4.pth, best.pt (YOLO) — DO NOT TOUCH
```

End-to-end scan path:
`App → POST /scan-sessions (Node, multipart) → POST /scan-multi (Flask) → JSON {lesions[], whole_image, …} → Node persists crops/overlays as files → App renders carousel + whole-image XAI card.`

Live mode: `App (3 fps reticle crop) → Node /detect-fast proxy → Flask /detect-fast (detector only).`

## 2. What has already been built (working today)

- Full auth flow (register/login/refresh-token rotation/logout/profile) with JWT + bcrypt.
- Camera scan flow: intro → live camera (3 fps live detection in reticle, status pill,
  offline banner, blur gate) → review (per-lesion XAI carousel, whole-image XAI card,
  primary benign/malignant banner, save form).
- Gallery upload path (skips camera enhancement; PIL EXIF+ICC-correct loader server-side).
- Scan-first history with edit/delete; full scan report screen; notifications; home vitals/UV.
- Model server: YOLOv12n detector → flat 7-class classifier (arch-switchable
  resnet50 / efficientnet_b4 via `_LOADERS` dispatch) → per-lesion + whole-image Grad-CAM,
  soft-containment bbox dedupe (mirrored client/server), TTA, low-confidence warnings.
- Tests: 28 Jest (MyApp), 1 supertest (Node), 20 pytest (model-server) — all passing at audit time.
- A mature design-token system (`constants/theme.ts`) used consistently across screens.

## 3. Frontend issues found

| # | Issue | Severity | File |
|---|-------|----------|------|
| F1 | `ScanReviewLoading` references `styles.elapsed` and `styles.subHint` that don't exist → 2 TS errors; elapsed counter + slow-scan hint render unstyled | Low (TS) / visible polish | `components/ScanReviewLoading.tsx:84,87` |
| F2 | `history.tsx:338` — type-predicate mismatch (mapped session lesions not annotated as `RegionView[]`) → 2 TS errors | Low (TS only) | `app/(tabs)/history.tsx` |
| F3 | `history.tsx:1102` — `listTab` is a `const` literal `'sessions'`, so `listTab === 'lesions'` is an always-false comparison → TS2367. The lesions branch is intentionally kept (scan-first history) but the type kills it | Low (TS only) | `app/(tabs)/history.tsx:850,1102` |
| F4 | `__tests__/useLiveDetect.test.ts` — missing types for `react-test-renderer` → TS7016 | Low | missing `@types` |
| F5 | Stale hardcoded model name `'EfficientNet-B0 hierarchical + YOLOv12n (Grad-CAM)'` shown in UI — actual model is now config-driven (ResNet50 on main, EfficientNet-B4 on this branch) | Medium (wrong info shown to user) | `hooks/useLesions.ts:289` |
| F6 | A handful (9) of hardcoded hex/rgba values outside `theme.ts` (camera chrome, welcome) | Very low | 6 files |
| F7 | `expo-camera` `takePictureAsync` typing drift — `(photo as any).uri` | Accepted (documented in CLAUDE.md) | camera.tsx, useLiveDetect.ts |

**Overall frontend verdict:** the UI is already modern, token-driven, and accessible
(accessibility labels/roles present on camera controls and buttons; `contain` resize honored;
loading + error + empty states exist on every data screen). A visual redesign is NOT needed and
would be risk without reward. The right move is surgical: fix the TS drift, fix the stale model
label, and polish the loading component.

## 4. Flask / backend issues found

| # | Issue | Severity | File |
|---|-------|----------|------|
| B1 | No `/health` endpoint on Flask (Node has one; Flask only has legacy `GET /` which also exposes weight paths) | Medium | `model-server/app.py` |
| B2 | No request-size cap (`MAX_CONTENT_LENGTH` unset) → oversized uploads consume memory/CPU before failing | Medium | `app.py` |
| B3 | Unhandled errors return Flask HTML error pages, not JSON (no 404/405/413/500 JSON handlers) | Medium | `app.py` |
| B4 | No stage timing logs in `/scan-multi` — impossible to attribute latency (detect vs classify vs Grad-CAM vs encode) | Medium | `routes/scan.py` |
| B5 | `helpers.save_enhanced_pair_from_upload` does **4 disk round-trips per camera scan**: writes temp file, re-reads it for blur check, writes orig + enhanced, then **re-reads the enhanced file from disk** to build `img_pil`. All computable in memory | Medium (latency, I/O) | `helpers.py` |
| B6 | `/scan-multi` annotated canvas: `cv2.imwrite` to disk then re-`open()`+read for base64 — encode once in memory instead | Low-medium | `routes/scan.py:214-217` |
| B7 | Flask-side Mongo `insert_one` failure (Mongo down) → entire scan request 500s **after** all inference completed. Node persists its own copy anyway; Flask persistence should be best-effort | Medium (reliability) | `routes/scan.py:246` |
| B8 | Mongo client uses default 30 s server-selection timeout — a down Mongo blocks requests for 30 s | Low-medium | `app.py` |
| B9 | Response includes no `model_name`, forcing clients to hardcode (see F5) | Low | `routes/scan.py` |
| B10 | `scan.py` docstring says "MobileNetV2 7-class" — stale (cosmetic) | Very low | `routes/scan.py:1` |
| B11 | Node `lesions.js` hardcodes `modelName: 'effnet_b0_hierarchical + YOLO (Grad-CAM)'` — stale | Low | `xai-skin-backend/routes/lesions.js` |
| B12 | `detect_fast` returns inference `ms` but logs nothing — fine for dev; total request timing not logged | Very low | `routes/scan.py` |

Things that are already **correct** (verified, do not "fix"):
- Models load **once** at import time (`lesion_classifier`, `lesion_detector`, `gradcam_explainer` are module-level singletons). No per-request loading.
- Grad-CAM target layer resolution is arch-aware (`layer4[-1]` / `_conv_head` duck-typing).
- Per-lesion Grad-CAM runs on the **padded crop**, whole-image Grad-CAM on the full raw image (hard rule, fixed in past sessions — preserve).
- Classifier sees raw (un-enhanced) pixels; display path uses enhanced (hard rule — preserve).
- `/detect-fast` (Flask + Node proxy) is already disk-free (memory multipart, `imdecode`).
- Node already has: 10 MB multer limits, JSON global error handler, morgan logging, axios timeout + granular 502 mapping, refresh-token rotation.

## 5. Latency / performance analysis

Measured/known (from repo docs + memory): `/detect-fast` dev-box p50 ≈ 257 ms (CPU YOLOv12n),
cold first request ≈ 1.3 s, warm LAN RTT 286–333 ms. Client 3 fps cap absorbs this.

`/scan-multi` latency budget per request (CPU): N×(classifier TTA = 4 forward passes) +
N×Grad-CAM backward + whole-image classify + whole-image Grad-CAM + YOLO detect + PNG encodes
+ **the disk round-trips in B5/B6**. The disk I/O is the only part that is pure waste; the rest
is model compute. B5+B6 removal is the safe latency win. Timing logs (B4) make the rest measurable
so future optimization (GPU, ONNX, reduced TTA) is evidence-based, not guesswork.

Not attempted (risky / changes predictions): disabling TTA, FP16/quantization, resizing before
detect, batch-stacking TTA flips. Listed under "Recommended next".

## 6. Suggested improvement ideas

**Implement now (safe, high value):**
1. Flask `/health` + JSON error handlers + `MAX_CONTENT_LENGTH` (B1–B3).
2. Stage timing logs in `/scan-multi` + `timings_ms` and `model_name` in response — additive only (B4, B9).
3. Remove disk round-trips in `helpers.py` and annotated-canvas encode (B5, B6).
4. Best-effort Flask Mongo persistence + 5 s server-selection timeout (B7, B8).
5. Model-name passthrough Flask → Node → app; kill stale hardcoded strings (F5, B11).
6. Fix all 6 TypeScript errors (F1–F4) — zero behavior change.
7. ScanReviewLoading polish: style the elapsed counter + slow-scan hint (F1).

**Recommended next (needs approval/testing):**
- Batch the 4 TTA flips into a single forward pass (stack into one tensor) — ~same math, needs
  numerical-equivalence verification against current outputs before shipping.
- `torch.inference_mode()` + `torch.set_num_threads` tuning for CPU serving.
- GPU or ONNX-runtime serving for production (`/detect-fast` 150 ms target).
- Replace deprecated `react-test-renderer` usage with `@testing-library/react-native`.
- Upload cleanup job for `public/uploads/` orphans (files whose sessions were deleted before
  the delete-cleanup logic existed).
- Pin `expo-camera` types / remove `(photo as any)` casts when upstream types stabilize.
- Rate limiting + helmet on the Node API for production.

**Not recommended:**
- Visual redesign of the app — the token system is mature; wholesale restyling risks the
  documented UX hard rules (contain-not-cover, reticle coordinate math, auth back button).
- Changing classifier preprocessing, label order, or TTA defaults — affects predictions.
- Moving Node image persistence to base64-in-Mongo — files are the right call here.
- Removing the legacy Flask routes — still referenced as backward compatibility.

## 7. Prioritized implementation checklist

| Step | Change | Status |
|------|--------|--------|
| 1 | This audit document | **Done** |
| 2 | Flask: `MAX_CONTENT_LENGTH`, JSON error handlers, `/health`, 5 s Mongo timeout (`app.py`) | **Done** |
| 3 | Flask: stage timings + `model_name`/`timings_ms` in `/scan-multi`; best-effort Mongo insert; in-memory annotated encode; docstring fix (`routes/scan.py`) | **Done** |
| 4 | Flask: in-memory quality pipeline in `helpers.py` (drop temp file + enhanced re-read) | **Done** |
| 5 | Node: `model_name` passthrough in `scanSessions.js`; stale modelName fix in `lesions.js` | **Done** |
| 6 | App: `useLesions.ts` model name from response (generic fallback) | **Done** |
| 7 | App: fix TS errors — ScanReviewLoading styles, history.tsx ×2, react-test-renderer shim | **Done** |
| 8 | App: lint cleanup — escape apostrophe in `scan-session/[id].tsx` (the 1 lint error), drop unused import/var in history.tsx, `Array<T>`→`T[]` in camera.tsx | **Done** (lint 1 error/9 warnings → 0 errors/6 warnings; remainder pre-existing in untouched files — see log) |
| 9 | Verify: `tsc --noEmit` clean (6→0 errors), `npm test` (MyApp 28/28), `npx jest` (Node 1/1), `pytest model-server/tests` (20/20), Flask import + `/health` + error-handler + end-to-end `/scan-multi` smoke test, `expo lint` (0 errors) | **Done** |
| 10 | IMPLEMENTATION_LOG.md | **Done** |
| — | Manual on-device pass (`expo start` + physical device scan) | **Needs manual review** (steps in IMPLEMENTATION_LOG.md §How to verify manually) |
| — | helpers.py quality-metric consistency change (blur scored on raw array, not re-encoded JPEG) | **Needs manual review** (borderline-blur flips possible; see §9 risk note) |

## 8. Files to change vs. leave alone

**Will change:** `model-server/app.py`, `model-server/routes/scan.py`, `model-server/helpers.py`,
`xai-skin-backend/routes/scanSessions.js`, `xai-skin-backend/routes/lesions.js`,
`MyApp/components/ScanReviewLoading.tsx`, `MyApp/app/(tabs)/history.tsx`,
`MyApp/hooks/useLesions.ts`, `MyApp/types/react-test-renderer.d.ts` (new).

**Do not touch unless necessary:** `model-server/weights/*` (never), `config.py` label maps,
`services/classifier.py` / `explainer.py` / `preprocess.py` (prediction-critical),
`lib/bboxLayout.ts` / `bboxDedupe.ts` + server mirror (hard-rule pairs),
`LesionXaiCarousel.tsx` resize modes, auth back-button navigation, `routes/legacy.py`
(compat surface), Mongo schemas.

## 9. Risks and assumptions

- **Assumption:** `/scan-multi` response is consumed only by Node (`scanSessions.js`,
  `lesions.js`) — verified by grep. Additive response fields (`model_name`, `timings_ms`) are safe.
- **Assumption:** Flask-side Mongo session insert is secondary persistence (Node keeps the
  authoritative `ScanSession` document). Making it best-effort changes behavior only when Mongo
  is down — previously a 500, now a successful scan with `session_id: null`. Documented.
- **Risk:** `helpers.py` refactor must keep the *saved file contents* byte-identical in spirit
  (same PIL→BGR conversion, same imwrite) because legacy routes reference the saved names.
  Mitigated by changing only *how* metrics/img_pil are computed, not what is written.
- **Risk:** quality metric drift — `is_blurry` previously read the JPEG temp file (re-encoded at
  quality=95) while other metrics used the in-memory array. Computing all metrics from the same
  in-memory array is more consistent but can flip borderline blur classifications
  (threshold 20.0). Accepted: this is a bug-fix-grade inconsistency, and the camera client
  already gates blur at capture time. Flagged for manual review.
- TS fixes are compile-time only; no runtime behavior change.
