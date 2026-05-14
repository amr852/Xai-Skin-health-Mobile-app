# Realtime Lesion Detection + Camera UX Overhaul — Spec

## Goal

Upgrade the **Xai Skin Health** mobile app so users can:

1. **Detect lesions in realtime** by pointing the camera at skin (live bbox overlay, class label, severity color), instead of having to capture → upload → wait for a full scan response.
2. Still **upload a still image** (camera capture or gallery pick) and run the existing 2-stage pipeline (YOLO12n detect → ResNet50 classify → Grad-CAM).
3. Use a **redesigned camera screen** that is clean, calm, easy to understand for non-technical users, and consistent with the plum/rose floral-clinical theme already defined in `MyApp/constants/theme.ts`.

## Required reading before any work

The agent / engineer MUST read these files in this order before writing code:

1. `README.md` (repo root) — architecture overview, key files, conventions.
2. `MyApp/README.md` — Expo entry-point notes.
3. `PROJECT_MASTER_STATE.md` — what is implemented, what is out of scope, ops notes.
4. `REDESIGN_PLAN.md` — prior UI redesign decisions.
5. `MyApp/UX_ENHANCEMENT_PLAN.md` — prior UX direction.
6. `MyApp/app/(tabs)/camera.tsx` (~1022 LOC) — current scan flow: camera, review, analysis hook, bbox overlay, XAI carousel, loading.
7. `MyApp/hooks/useLesions.ts` — `analyzeImage` → `/scan-sessions`.
8. `MyApp/lib/api.ts`, `MyApp/lib/mediaUrl.ts` — API base URL + media URL normalization.
9. `MyApp/components/ImageWithBboxOverlay.tsx` — current bbox drawing.
10. `MyApp/lib/bboxDedupe.ts` — client-side soft-containment dedupe.
11. `xai-skin-backend/routes/scanSessions.js` — `/scan-sessions` POST handler.
12. `model-server/routes/scan.py` — `/scan-multi` pipeline.
13. `model-server/services/bbox_dedupe.py` — server dedupe (must stay mirrored with `bboxDedupe.ts`).
14. `MyApp/constants/theme.ts` — single source for color / spacing / radius tokens.

Do not hardcode colors or duplicate dedupe logic; reuse tokens and shared helpers.

## Current stack (do not change without product sign-off)

- **Mobile**: React Native + Expo SDK 54 (NOT Flutter). File-based router (`app/`). Theme tokens in `constants/theme.ts`.
- **Backend**: Node.js + Express + MongoDB (`xai-skin-backend/`). `/scan-sessions` is the canonical scan entrypoint; `PATCH /scan-sessions/:id` for user metadata.
- **Models**: Flask (`model-server/`), YOLO12n detector + ResNet50 classifier (`best.pt`, `resnet50_best.pth`) + Grad-CAM. Soft-containment bbox dedupe lives in `services/bbox_dedupe.py`.

Realtime feature must keep this contract; the realtime path is an additive endpoint, not a rewrite.

## Functional requirements

### Realtime detection mode

- New **"Live" toggle** on the camera screen. Two modes: **Live** (realtime detect-only) and **Scan** (existing capture + full pipeline + Grad-CAM).
- In Live mode:
  - Stream low-res frames (~256–384 px on the long side, JPEG quality ~60) to a new model-server endpoint **`POST /detect-fast`** at a capped rate (target 3–5 fps; configurable).
  - `/detect-fast` runs **detector only** (no classifier, no Grad-CAM) and returns boxes + per-box top-1 class + confidence + suggested severity color.
  - Overlay returned boxes on the live preview using existing `ImageWithBboxOverlay` styling (rounded plum/rose rect, label chip).
  - Show an unobtrusive **"Tap to scan"** hint: tapping a live box freezes the frame and runs the full `/scan-multi` pipeline on that frame for Grad-CAM + classifier output.
  - Backpressure: never have more than one in-flight request per device; drop frames when busy.
- In Scan mode: behavior unchanged from today (capture → review → POST `/scan-sessions`).

### Upload-image mode

- Already exists via the existing gallery-pick path in `camera.tsx`. Verify it still works after the rewrite and surface it as a clearly labelled **"Upload photo"** button on the redesigned camera screen.
- Both **capture** and **upload** flow into the same review screen and the same `/scan-sessions` POST.

### Camera screen redesign

Redesign `MyApp/app/(tabs)/camera.tsx` (or split it into smaller components under `MyApp/components/camera/`) for clarity. Target users include people unfamiliar with medical apps.

UI requirements:

- Mode toggle (Live / Scan) pinned top-center, segmented control, plum/rose tokens only.
- Centered framing reticle (rounded square) with subtle on-screen guidance: "Hold camera ~15 cm from skin, good light, lesion inside the frame."
- Large, obvious shutter button (Scan mode) or live-recording dot (Live mode).
- Secondary actions as labelled icon buttons: **Flash**, **Front/Back camera flip**, **Upload photo**, **Help** (opens a short bottom-sheet explaining what each mode does).
- Severity legend chip strip: small color swatches with class labels so users can read overlay colors.
- Loading + empty states themed via existing `ScanReviewLoading` and skeleton tokens; no raw spinners.
- No hardcoded hex — every color/spacing must resolve from `constants/theme.ts` (`C`, `Radius`, `Overlay`, `Gradient`).
- Accessibility: 44×44 tap targets, `accessibilityLabel` on every actionable element, contrast checked against the plum/rose palette.

### Result + history integration

- A still-image scan (capture or upload) goes through the existing `/scan-sessions` flow and shows up in scan-first history, no schema changes needed.
- A "promote live frame to full scan" action runs `/scan-multi` and **POSTs** the result to `/scan-sessions` like a normal scan, so it lands in history too.
- Live-only frames (no full pipeline) are not persisted. This avoids history bloat.

## Non-functional requirements

- **Latency target (Live mode)**: <250 ms p50 round-trip per frame on Wi-Fi LAN; <400 ms p95. Show realtime FPS counter only in dev builds (gated by `__DEV__`).
- **Bandwidth**: aim for <60 KB per frame at the configured quality.
- **Battery / heat**: cap effective frame rate; pause stream when the screen is backgrounded or the user leaves the camera tab.
- **Offline**: if the backend is unreachable, Live mode shows a clear "Offline — switch to Scan mode" banner; Scan mode behavior unchanged.
- **Existing tests**: `MyApp` Jest, `xai-skin-backend` supertest, `model-server` pytest must all stay green.
- **Bbox dedupe**: any new endpoint must also call `bbox_dedupe.soft_dedupe` (or a faster detector-only variant) so the client doesn't see flicker from overlapping aggregate boxes.

## Out of scope

- Retraining or swapping the detector / classifier.
- New cloud object storage (uploads stay in `xai-skin-backend/public/uploads/`).
- On-device TFLite (defer; this iteration is server-side inference).
- Auth / user model changes.
- Web client.

## Decisions (locked 2026-05-14)

1. **Inference**: server-side `POST /detect-fast` on Flask. Reuses existing `best.pt` YOLO12n weights and `services/bbox_dedupe.soft_dedupe`. No on-device TFLite this iteration.
2. **Frame rate**: 3 fps hard cap. Backpressure = 1 in-flight request per device; drop frames when busy. Pause stream on background / tab-leave.
3. **Privacy**: full frames sent to server (LAN). No on-device crop pre-pass. Same trust model as existing `/scan-sessions` uploads.
4. **Reticle**: visual guide only. No min/max bbox-size gate. Sharpness gate (Laplacian variance via existing `laplacianVarianceForImageUri`) blocks capture instead — covers the "too far / blurry" failure mode.
5. **Severity legend**: cut from scope. Overlay colors derive from `statusFromPrediction`; no legend strip, no on-demand explainer.
6. **Auto-capture**: cut from scope. User taps shutter explicitly; live overlay is detection aid only.
7. **Help content**: cut from scope this iteration. Reticle hint text lives inline in `camera.tsx` as a `const` string.

### Capture trigger flow (clarification)

When a live bbox appears, user taps the shutter. App captures a **fresh hi-res still** (not the streamed low-res frame) and submits via the existing `POST /scan-sessions` → classifier + Grad-CAM + history path. Live-stream frames are never persisted to history.

### Overlay color

Live bboxes use `statusFromPrediction` colors so they match the result-screen palette. Color is computed client-side from the per-box class label returned by `/detect-fast`; no extra server work.

### Out of scope (deferred, not cancelled)

- TFLite on-device detection.
- Auto-capture on stable lesion.
- Severity legend chip strip.
- Dev-only FPS counter.
- Adaptive frame-rate throttling.
- Help bottom-sheet.

## Definition of done

- Live mode works on a physical Android device against a LAN backend; bboxes track a printed test lesion at ≥3 fps with visible overlay updates.
- Tapping a live box produces a full Grad-CAM result identical to today's Scan path.
- Capture mode and Upload mode both still create scan sessions and appear in history with correct metadata.
- Redesigned camera screen uses only `theme.ts` tokens; lint + typecheck + Jest pass.
- New `/detect-fast` endpoint has a smoke test in `model-server/tests/`.
- README.md updated with the new mode + endpoint.
