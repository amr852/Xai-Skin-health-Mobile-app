# Realtime Lesion Detection — Implementation Plan & Tracker

Companion to [`realtime-lesion-detection.md`](realtime-lesion-detection.md). Spec defines **what**; this file tracks **how far we've built it**.

**Owner:** TBD  •  **Started:** 2026-05-14  •  **Target:** TBD

## Status legend

| Marker | Meaning |
|--------|---------|
| `[ ]`  | not started |
| `[~]`  | in progress |
| `[x]`  | done & merged |
| `[-]`  | cut from scope (intentional) |
| `[!]`  | blocked (see note) |

Update markers in place as work lands. Keep notes terse — one line per item.

---

## Phase 1 — Flask `/detect-fast` endpoint

Detector-only fast path. Blocking dependency for every mobile-side task.

- [x] **1.1** Add `POST /detect-fast` route in `model-server/routes/scan.py` (or new `routes/detect.py` if `scan.py` grows past ~700 LOC).
- [x] **1.2** Accept multipart JPEG; cap inbound side to ~512px (reject if larger) to enforce bandwidth contract.
- [x] **1.3** Reuse loaded YOLO12n model (`best.pt`) — do NOT re-load per request; pull from existing module-level singleton used by `/scan-multi`.
- [x] **1.4** Run `services/bbox_dedupe.soft_dedupe` on detector output. No classifier, no Grad-CAM.
- [x] **1.5** Return JSON: `{ boxes: [{ x, y, w, h, cls, conf }], width, height, ms }` (normalized coords 0..1 + ms timing for client debugging).
- [x] **1.6** Smoke test in `model-server/tests/test_detect_fast.py`: synthetic 320×320 fixture, asserts schema + dedupe applied.
- [x] **1.7** Latency check: p50 < 150 ms on dev box for 320px input (manual; record in PR description). _Measured 2026-05-15 via `scripts/bench_detect_fast.py` (warmup + 30 iters, 320×320 synthetic): **p50 = 257 ms, p95 = 315 ms** on dev box (Windows, CPU YOLOv12n). Above spec target — see Open risks #4._

**Notes / blockers:**
- _(empty)_

---

## Phase 2 — Mobile live-stream loop

- [x] **2.1** New hook `MyApp/hooks/useLiveDetect.ts`: owns frame-capture loop, in-flight guard, fps cap (3), `AbortController` on unmount.
- [x] **2.2** Frame capture via `CameraView.takePictureAsync({ quality: 0.6, skipProcessing: true, base64: false })` → downscale to ~320px long-side via `expo-image-manipulator` before upload.
- [x] **2.3** `POST` to `/detect-fast` through existing `api.ts` base-URL resolver. Reuse multipart pattern from `useLesions.analyzeImage`.
- [x] **2.4** Backpressure: hard skip if request already in flight; no queue.
- [x] **2.5** Pause loop on `AppState !== 'active'` and on tab blur (`useFocusEffect`).
- [x] **2.6** Surface latest `LiveDetection[]` via hook return; consumer (camera screen) re-renders overlay only.
- [x] **2.7** Offline detection: if 2 consecutive requests fail with network error → set `offline=true`, stop loop, expose flag for banner UI.

**Notes / blockers:**
- _(empty)_

---

## Phase 3 — Camera screen redesign + Live/Scan mode toggle

Touches [`MyApp/app/(tabs)/camera.tsx`](../MyApp/app/(tabs)/camera.tsx). File is ~1022 LOC today — split if it grows further.

- [x] **3.1** Segmented control (`Live` / `Scan`) pinned top-center. Plum/rose tokens only. Default = `Scan`.
- [x] **3.2** In `Live` mode, mount `useLiveDetect` and render `ImageWithBboxOverlay` over the live `CameraView`. Reuse existing bbox drawing — do NOT fork a second overlay component.
- [x] **3.3** Overlay color: per-box `statusFromPrediction(cls)` → severity color from `theme.ts`.
- [x] **3.4** Centered rounded-square reticle: SVG or absolute-positioned `View` with border-radius from `Radius.lg`. Subtle inner shadow via `Overlay`.
- [x] **3.5** Reticle caption: `"Hold camera ~15 cm from skin. Use bright, even light. Keep the lesion inside the frame."` Single `const` in `camera.tsx`, no new asset.
- [x] **3.6** Existing capture-instructions intro bullets ([`camera.tsx:38-44`](../MyApp/app/(tabs)/camera.tsx#L38-L44)) stay; surfaced from the `intro` phase as today.
- [x] **3.7** "Upload photo" button: clearly labelled, route through existing gallery-pick path. No behavioral change to gallery upload.
- [x] **3.8** Offline banner (consumes `offline` from `useLiveDetect`): "Offline — switch to Scan mode." Toggle auto-flips to Scan when tapped.
- [x] **3.9** Accessibility: every actionable element gets `accessibilityLabel`; 44×44 minimum tap targets.

**Notes / blockers:**
- _(empty)_

---

## Phase 4 — Capture-assist (sharpness gate)

- [x] **4.1** Wire `laplacianVarianceForImageUri` into the shutter handler in both `Live` and `Scan` modes (currently only used in some paths — audit before adding).
- [x] **4.2** Below `LAPLACIAN_VARIANCE_THRESHOLD` → show toast "Photo looks blurry — try again with steadier hands and brighter light." Do NOT proceed to `/scan-sessions`.
- [x] **4.3** Capture trigger flow: live bbox visible → user taps shutter → fresh hi-res `takePictureAsync` (no `skipProcessing`) → sharpness gate → `useLesions.analyzeImage` → review screen as today.

**Notes / blockers:**
- _(empty)_

---

## Phase 5 — Tests

- [x] **5.1** `model-server/tests/test_detect_fast.py` (covered in 1.6).
- [x] **5.2** `MyApp/__tests__/useLiveDetect.test.ts`: mock fetch, assert fps cap, in-flight guard, AppState pause.
- [x] **5.3** Existing `bboxDedupe.test.ts` + `imagePreviewFrame.test.ts` stay green after camera refactor.
- [ ] **5.4** Manual device test on physical Android over LAN: bboxes track printed test lesion at ≥3 fps, tap-to-capture produces full Grad-CAM result, offline banner appears when backend killed.

**Notes / blockers:**
- _(empty)_

---

## Phase 6 — Docs

- [x] **6.1** `README.md` gets `Live mode` paragraph + `/detect-fast` row in "Quick start" or a new endpoint table.
- [x] **6.2** `planning/realtime-lesion-detection.md` "Decisions" section reflects locked-in choices.
- [-] **6.3** Update `MyApp/README.md` (if present) with Live-mode env note — only if non-trivial config change appears during impl. _(Cut: no MyApp/README.md exists and no new env config introduced — Live mode reuses existing `api.ts` base-URL resolver.)_

---

## Cut from scope (do not re-open without product sign-off)

- [-] On-device TFLite detection.
- [-] Auto-capture on stable lesion (1.5 s rule).
- [-] Severity legend chip strip / on-demand color explainer.
- [-] Dev-only FPS counter (`__DEV__` gated).
- [-] Adaptive frame-rate throttling.
- [-] Hybrid (on-device detect + server Grad-CAM).
- [-] Help bottom-sheet content asset.

---

## Open risks

1. **`takePictureAsync` cadence on Android.** Some devices stall the camera pipeline when called >2 Hz. Mitigation: 3 fps cap + `skipProcessing: true` for live frames; fall back to `useCameraView.onCameraReady` gating if stalls observed.
2. **Reused YOLO singleton thread-safety.** Flask dev server is single-threaded by default; if we move to gunicorn workers, ensure the model is loaded per worker (it already is in `/scan-multi` — confirm).
3. **Bandwidth on cellular.** Spec assumes LAN. If a user is on LTE, 3 fps × 60 KB = 180 KB/s sustained. Acceptable but note in offline-banner copy if we ever detect non-Wi-Fi.
4. **Dev-box CPU latency above spec target.** YOLOv12n p50 on the dev box (Windows, CPU) is 257 ms vs. spec target of 150 ms. Client-side 3 fps cap absorbs this for LAN dev, but production deployment needs either GPU inference or a quantized/distilled detector before this is real-time on consumer devices. Tracked here so it does not silently drift.

---

## How to use this tracker

- Update markers in the same PR that lands the work.
- If a task expands into >1 PR, split it into sub-bullets (`1.5.a`, `1.5.b`) rather than letting it sit `[~]` for weeks.
- New scope arriving mid-build → add a new phase or sub-task; do NOT silently inflate an existing one.
- When all phases are `[x]` or `[-]`, archive this file under `planning/done/`.
