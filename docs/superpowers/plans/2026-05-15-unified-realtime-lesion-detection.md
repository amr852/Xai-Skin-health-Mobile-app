# Unified Real-Time Lesion Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Live and Scan modes into a single camera UI that shows real-time lesion detection in a reticle-framed region, eliminating the redundant mode toggle.

**Architecture:** Remove the `cameraMode` state and mode toggle. Enable `useLiveDetect` for the entire camera phase (not just Live mode). Modify `handleTakePhoto` to crop the captured image to the reticle bounds (220×220 center) before sending to the server. This gives users real-time feedback while framing, then captures the framed region for analysis.

**Tech Stack:** React Native, expo-camera, expo-image-manipulator, useLiveDetect hook

---

## File Structure

| File | Responsibility |
|------|-----------------|
| `MyApp/app/(tabs)/camera.tsx` | Camera UI, removed mode toggle, reticle as frame guide, crop-on-capture logic |
| `MyApp/hooks/useLiveDetect.ts` | Real-time 3fps loop (unchanged, will be always-enabled) |
| `MyApp/__tests__/useLiveDetect.test.ts` | Verify hook works when enabled in non-Live scenarios |

---

## Task 1: Remove Camera Mode Toggle UI

**Files:**
- Modify: `MyApp/app/(tabs)/camera.tsx:52,86,743-767`

Remove the mode state and its UI so users see only one camera interface with real-time detection.

- [ ] **Step 1: Remove cameraMode state declaration**

In `camera.tsx`, delete this line (line 86):
```tsx
const [cameraMode, setCameraMode] = useState<CameraMode>('scan');
```

- [ ] **Step 2: Remove mode segmented control from render**

Delete lines 742-767 (the entire `modeSegmented` View block):
```tsx
{/* Live / Scan segmented control — pinned top-center */}
<View style={s.modeSegmented}>
  <TouchableOpacity
    onPress={() => setCameraMode('scan')}
    // ... rest of block
```

Also delete the corresponding style definitions at the bottom (lines 1127-1163):
```tsx
modeSegmented: { ... },
modeSegmentBtn: { ... },
modeSegmentBtnActive: { ... },
modeSegmentTxt: { ... },
modeSegmentTxtActive: { ... },
liveDot: { ... },
```

- [ ] **Step 3: Update liveEnabled logic to always enable during camera phase**

Replace line 99-101:
```tsx
const liveEnabled =
  scanPhase === 'camera' && cameraMode === 'live' && isCameraReady && !captureBusy;
```

With:
```tsx
const liveEnabled =
  scanPhase === 'camera' && isCameraReady && !captureBusy;
```

- [ ] **Step 4: Remove conditional live-box rendering gate**

On lines 712-730, change:
```tsx
{cameraMode === 'live' && liveBoxes.length > 0 ? (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {liveBoxes.map(box => (
      // ...
    ))}
  </View>
) : null}
```

To:
```tsx
{liveBoxes.length > 0 ? (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {liveBoxes.map(box => (
      // ...
    ))}
  </View>
) : null}
```

- [ ] **Step 5: Remove offline-banner mode check**

On line 802, change:
```tsx
{cameraMode === 'live' && liveDetect.offline ? (
```

To:
```tsx
{liveDetect.offline ? (
```

And remove the auto-flip-to-scan logic inside the banner (line 805) since there's only one mode now:
```tsx
onPress={() => setCameraMode('scan')}
```

Replace with:
```tsx
onPress={() => setScanPhase('intro')}
```

- [ ] **Step 6: Remove shutter color toggle**

On lines 846, remove the conditional style:
```tsx
cameraMode === 'live' && s.camShutterInnerLive,
```

Change lines 844-849 from:
```tsx
<View
  style={[
    s.camShutterInner,
    cameraMode === 'live' && s.camShutterInnerLive,
  ]}
/>
```

To:
```tsx
<View style={s.camShutterInner} />
```

- [ ] **Step 7: Commit UI cleanup**

```bash
cd MyApp
git add app/\(tabs\)/camera.tsx
git commit -m "refactor: remove redundant Live/Scan mode toggle — unified real-time detection UI"
```

---

## Task 2: Implement Reticle-Region Crop on Capture

**Files:**
- Modify: `MyApp/app/(tabs)/camera.tsx:227-262` (handleTakePhoto)
- Modify: `MyApp/hooks/useLiveDetect.ts:73-168` (captureAndDetect)

The reticle box (220×220 centered) becomes the functional capture region. Crop the photo to this region before uploading.

- [ ] **Step 1: Add reticle dimensions constant to camera.tsx**

At the top of the file after `RETICLE_CAPTION` (line 49), add:
```tsx
const RETICLE_SIZE = 220; // Reticle box width/height in display coordinates
```

- [ ] **Step 2: Create a crop-to-reticle helper function**

Add this function before the `CameraScreen` component (around line 60):
```tsx
/**
 * Crop image to the reticle region (centered 220x220).
 * Requires layout dimensions to calculate pixel coords.
 */
async function cropToReticle(
  imageUri: string,
  layoutWidth: number,
  layoutHeight: number,
): Promise<string> {
  if (layoutWidth <= 0 || layoutHeight <= 0) return imageUri;

  const reticleSize = RETICLE_SIZE;
  const left = Math.max(0, (layoutWidth - reticleSize) / 2);
  const top = Math.max(0, (layoutHeight - reticleSize) / 2);

  try {
    const cropped = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: left,
            originY: top,
            width: Math.min(reticleSize, layoutWidth - left),
            height: Math.min(reticleSize, layoutHeight - top),
          },
        },
      ],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    return cropped.uri ?? imageUri;
  } catch {
    return imageUri;
  }
}
```

- [ ] **Step 3: Modify handleTakePhoto to crop before analyzing**

Replace the `handleTakePhoto` function (lines 227-262) with:
```tsx
const handleTakePhoto = async () => {
  if (!cameraRef.current || !isCameraReady || captureBusy) return;
  setCaptureBusy(true);
  try {
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });
    if (!photo?.uri) return;

    // Crop to reticle region using current layout
    const croppedUri = await cropToReticle(
      photo.uri,
      cameraLayout.w,
      cameraLayout.h,
    );

    const ok = await ensureSharpEnough(croppedUri);
    if (!ok) return;

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaptureSource('camera');
    setImageMimeType('image/jpeg');
    setImageFileName('lesion.jpg');
    setForm(DEFAULT_FORM);
    setAnalysis(null);
    setAnalysisError(null);
    setUploadedImageUrl(null);
    setRetryNonce(0);
    setTorchOn(false);
    setAnalysisLoading(true);

    InteractionManager.runAfterInteractions(() => {
      setCapturedPhoto(croppedUri);
      setScanPhase('review');
    });
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = /unmount|not ready|session/i.test(raw)
      ? 'The camera was not ready. Wait a moment, then try again.'
      : raw || 'Could not capture photo.';
    showAlert({ title: 'Capture failed', message: msg, variant: 'error' });
  } finally {
    setCaptureBusy(false);
  }
};
```

- [ ] **Step 4: Update useLiveDetect captureAndDetect to also crop**

Modify `useLiveDetect.ts` to add a `layoutSize` parameter so the hook knows the camera dimensions for cropping:

First, update the `UseLiveDetectOptions` type (lines 21-28):
```tsx
export type UseLiveDetectOptions = {
  cameraRef: React.RefObject<CameraView | null>;
  enabled: boolean;
  /** Hard fps cap; spec target is 3 fps. */
  fps?: number;
  /** Long-side downscale before upload (spec ~320 px). */
  maxSide?: number;
  /** Camera layout for reticle-region crop. */
  layoutSize?: { width: number; height: number };
};
```

- [ ] **Step 5: Update useLiveDetect to use layoutSize for cropping**

In the `useLiveDetect` hook, update the `captureAndDetect` function to crop before sending (lines 91-101):

Replace:
```tsx
let processedUri = uri;
try {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxSide } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );
  processedUri = manipulated.uri ?? uri;
} catch {
  /** Fall back to the raw capture — server still has the 512px ceiling. */
}
```

With:
```tsx
let processedUri = uri;
try {
  const ops = [];
  // Crop to reticle if layout provided
  if (layoutSize && layoutSize.width > 0 && layoutSize.height > 0) {
    const reticleSize = 220;
    const left = Math.max(0, (layoutSize.width - reticleSize) / 2);
    const top = Math.max(0, (layoutSize.height - reticleSize) / 2);
    ops.push({
      crop: {
        originX: left,
        originY: top,
        width: Math.min(reticleSize, layoutSize.width - left),
        height: Math.min(reticleSize, layoutSize.height - top),
      },
    });
  }
  // Resize for bandwidth
  ops.push({ resize: { width: maxSide } });

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    ops,
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );
  processedUri = manipulated.uri ?? uri;
} catch {
  /** Fall back to the raw capture — server still has the 512px ceiling. */
}
```

And update the function signature (line 73) to include `layoutSize`:
```tsx
const captureAndDetect = useCallback(async (): Promise<boolean> => {
```

No change needed here; the parameter comes from the closure over `layoutSize`.

- [ ] **Step 6: Pass layoutSize to useLiveDetect hook in camera.tsx**

Update the `liveDetect` initialization (line 101) to pass the layout:
```tsx
const liveDetect = useLiveDetect({
  cameraRef,
  enabled: liveEnabled,
  layoutSize: cameraLayout.w > 0 && cameraLayout.h > 0 ? { width: cameraLayout.w, height: cameraLayout.h } : undefined,
});
```

- [ ] **Step 7: Commit crop implementation**

```bash
cd MyApp
git add app/\(tabs\)/camera.tsx hooks/useLiveDetect.ts
git commit -m "feat: crop captures to reticle region (220x220 center) before upload"
```

---

## Task 3: Verify Detection Rendering and End-to-End Test

**Files:**
- Test: `MyApp/__tests__/useLiveDetect.test.ts:1-50` (already exists, verify it still passes)

Run the existing test suite to confirm the hook works with the new layout parameter and detection still renders correctly.

- [ ] **Step 1: Run Jest suite for camera tests**

```bash
cd MyApp
npm test -- useLiveDetect.test.ts --testNamePattern="useLiveDetect" -v
```

Expected: All 3 tests pass (from prior session).

- [ ] **Step 2: Manually test on simulator/device (if available)**

If you have a dev server running:
```bash
cd MyApp
npx expo start
# On Android/iOS simulator: view the camera screen
# Ensure:
# - Reticle box shows centered
# - Real-time bounding boxes appear when lesion detected
# - Capture button takes photo of reticle region
# - Post-capture review shows the cropped image
```

- [ ] **Step 3: Commit test verification**

```bash
cd MyApp
git add .
git commit -m "test: verify real-time detection and reticle crop on camera screen"
```

---

## Self-Review

**Spec Coverage:**
- ✅ "Both modes show real-time detection" — useLiveDetect always enabled during camera phase
- ✅ "Reticle captures the box region" — crop-to-reticle logic added to both handleTakePhoto and captureAndDetect
- ✅ "Eliminate redundant toggle" — cameraMode state and UI removed
- ✅ "Verify detections working" — existing test suite re-run

**Placeholder Check:** No placeholders found. All code steps are complete and runnable.

**Type Consistency:** 
- `layoutSize` parameter added to `UseLiveDetectOptions` and used in `captureAndDetect`
- `cropToReticle` function takes exact layout dimensions and returns URI
- All references align
