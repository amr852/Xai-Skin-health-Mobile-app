import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Platform, Image,
  ScrollView, KeyboardAvoidingView,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C, FontFamily, Shadow, Overlay, Radius } from '@/constants/theme';
import { useLesions, type LesionFields, type AnalyzeImageResult } from '@/hooks/useLesions';
import { ImageWithBboxOverlay } from '@/components/ImageWithBboxOverlay';
import { LesionFilterBar } from '@/components/LesionFilterBar';
import {
  LesionXaiCarousel,
  type LesionCarouselItem,
  type LesionXaiCarouselHandle,
} from '@/components/LesionXaiCarousel';
import { ScanReviewLoading } from '@/components/ScanReviewLoading';
import { dedupeNestedDetections } from '@/lib/bboxDedupe';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';
import { useAppAlert } from '@/components/ui/AppAlert';
import {
  laplacianVarianceForImageUri,
  LAPLACIAN_VARIANCE_THRESHOLD,
  GALLERY_LAPLACIAN_VARIANCE_THRESHOLD,
} from '@/lib/imageSharpness';
import { statusFromPrediction } from '@/lib/lesionSeverity';
import { useLiveDetect, type LiveDetection } from '@/hooks/useLiveDetect';
import { containLayout, bboxToOverlayRect, reticleCropInPhotoPx } from '@/lib/bboxLayout';
import { apiFetch } from '@/lib/api';

const DEFAULT_FORM: LesionFields = {
  title: '', description: '', location: '', status: 'Stable', notes: '',
};

const CAPTURE_INSTRUCTIONS = [
  'Use bright, even lighting — natural daylight near a window works well.',
  'Hold the phone steady and fill most of the frame with the lesion.',
  'Keep the lesion in sharp focus; avoid harsh shadows or glare.',
  'Shoot straight on when possible; avoid extreme angles.',
  'This tool is for personal tracking only — it is not a medical diagnosis.',
] as const;

const RETICLE_CAPTION =
  'Hold camera ~15 cm from skin. Use bright, even light. Keep the lesion inside the frame.';
const RETICLE_SIZE = 220; // Reticle box width/height in display coordinates

type ScanPhase = 'intro' | 'camera' | 'review';

/**
 * Crop the source photo to the on-screen reticle region.
 *
 * The reticle is RETICLE_SIZE px in *layout* coordinates, but
 * ImageManipulator.crop operates in *source-photo* pixels — so we map through
 * the camera preview's aspect-fill scale. Skips if any dimension is missing.
 */
async function cropToReticle(
  imageUri: string,
  layoutWidth: number,
  layoutHeight: number,
  photoWidth: number | undefined,
  photoHeight: number | undefined,
): Promise<string> {
  if (
    layoutWidth <= 0 ||
    layoutHeight <= 0 ||
    !photoWidth ||
    !photoHeight
  ) {
    return imageUri;
  }

  const { originX, originY, size } = reticleCropInPhotoPx(
    layoutWidth,
    layoutHeight,
    photoWidth,
    photoHeight,
    RETICLE_SIZE,
  );
  if (size <= 0) return imageUri;

  try {
    const cropped = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ crop: { originX, originY, width: size, height: size } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    return cropped.uri ?? imageUri;
  } catch {
    return imageUri;
  }
}

function liveSeverityColor(cls: string): string {
  const status = statusFromPrediction(cls).toLowerCase();
  if (status === 'urgent') return C.urgentBorder;
  if (status === 'stable') return C.stableBorder;
  return C.checkBorder;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanPhase, setScanPhase] = useState<ScanPhase>('intro');
  const [isFacingFront, setIsFacingFront] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [form, setForm]                   = useState<LesionFields>(DEFAULT_FORM);
  const [analysis, setAnalysis]           = useState<AnalyzeImageResult | null>(null);
  const [captureSource, setCaptureSource] = useState<'camera' | 'gallery'>('camera');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce]       = useState(0);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [imageFileName, setImageFileName] = useState('lesion.jpg');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [activeNav, setActiveNav]         = useState<NavKey>('scan');
  const [lesionHighlight, setLesionHighlight] = useState<'all' | number>('all');
  const [xaiCarouselIndex, setXaiCarouselIndex] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const xaiCarouselRef = useRef<LesionXaiCarouselHandle>(null);
  const carouselDragRef = useRef(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [permGranted, setPermGranted] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ w: 0, h: 0 });
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { addLesion, analyzeImage } = useLesions();
  const { token } = useAuth();
  const { showAlert, alertNode } = useAppAlert();

  /**
   * Live mode: useLiveDetect owns the 3fps capture loop, sharing the same
   * camera ref. It pauses automatically when `enabled` flips false (scan-phase
   * exit, app background).
   */
  const liveEnabled =
    scanPhase === 'camera' && isCameraReady && !captureBusy;
  const liveDetect = useLiveDetect({
    cameraRef,
    enabled: liveEnabled,
    layoutSize: cameraLayout.w > 0 && cameraLayout.h > 0 ? { width: cameraLayout.w, height: cameraLayout.h } : undefined,
  });

  const handleNav = (key: NavKey) => {
    if      (key === 'home')    router.push('/');
    else if (key === 'history') router.push('/history');
    else if (key === 'profile') router.push('/profile');
    else setActiveNav(key);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setForm(DEFAULT_FORM);
    setAnalysis(null);
    setAnalysisError(null);
    setUploadedImageUrl(null);
    setTorchOn(false);
    setScanPhase('intro');
    setImageMimeType('image/jpeg');
    setImageFileName('lesion.jpg');
    setRetryNonce(0);
    setCaptureSource('camera');
    setLesionHighlight('all');
    setXaiCarouselIndex(0);
  };

  /**
   * Block capture when Laplacian variance is below threshold. Surface a clear
   * "try again" message; decode failures fall through (don't block on infra).
   */
  const ensureSharpEnough = useCallback(
    async (uri: string, source: 'camera' | 'gallery' = 'camera'): Promise<boolean> => {
      try {
        const variance = await laplacianVarianceForImageUri(uri);
        const threshold =
          source === 'gallery'
            ? GALLERY_LAPLACIAN_VARIANCE_THRESHOLD
            : LAPLACIAN_VARIANCE_THRESHOLD;
        if (variance < threshold) {
          showAlert({
            title: 'Photo looks blurry',
            message:
              source === 'gallery'
                ? 'This photo is too blurry to analyze. Pick a sharper image.'
                : 'Photo looks blurry — try again with steadier hands and brighter light.',
            variant: 'warning',
          });
          return false;
        }
        return true;
      } catch {
        return true;
      }
    },
    [showAlert],
  );

  const openCamera = async () => {
    if (!token) {
      showAlert({
        title: 'Sign in required',
        message: 'Please log in to capture and analyze a lesion.',
        variant: 'warning',
      });
      return;
    }
    let granted = !!permission?.granted;
    if (!granted) {
      const r = await requestPermission();
      granted = !!r?.granted;
      if (!granted) {
        showAlert({
          title: 'Camera access',
          message: 'Camera permission is needed to take a lesion photo.',
          variant: 'warning',
        });
        return;
      }
    }
    setPermGranted(true);
    setIsFacingFront(false);
    setIsCameraReady(false);
    setScanPhase('camera');
  };

  const pickFromLibrary = async () => {
    if (!token) {
      showAlert({
        title: 'Sign in required',
        message: 'Please log in to analyze a lesion from your photos.',
        variant: 'warning',
      });
      return;
    }
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      showAlert({
        title: 'Photo library',
        message: 'Photo library access is needed to choose an image.',
        variant: 'warning',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const a = result.assets[0];
    const uri = a.uri;
    const mime =
      a.mimeType?.trim() ||
      (uri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg');
    const ext = mime === 'image/png' ? '.png' : '.jpg';
    const name = (a.fileName && a.fileName.trim()) || `lesion${ext}`;

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaptureSource('gallery');
    setImageMimeType(mime);
    setImageFileName(name);
    setForm(DEFAULT_FORM);
    setAnalysis(null);
    setAnalysisError(null);
    setUploadedImageUrl(null);
    setRetryNonce(0);
    const ok = await ensureSharpEnough(uri, 'gallery');
    if (!ok) return;
    setAnalysisLoading(true);
    setCapturedPhoto(uri);
    setScanPhase('review');
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || !isCameraReady || captureBusy) return;

    if (liveDetect.detections.length === 0) {
      showAlert({
        title: 'No lesion in frame',
        message: 'No skin lesion detected in the reticle. Point the camera at the area of concern and try again.',
        variant: 'warning',
      });
      return;
    }

    setCaptureBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (!photo?.uri) return;

      // Reticle-region crop: capture only the lesion inside the framing box.
      const croppedUri = await cropToReticle(
        photo.uri,
        cameraLayout.w,
        cameraLayout.h,
        photo.width,
        photo.height,
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

  const handleRetryAnalysis = useCallback(() => {
    setAnalysis(null);
    setAnalysisError(null);
    setUploadedImageUrl(null);
    setRetryNonce(n => n + 1);
    setForm(prev => ({ ...prev, status: DEFAULT_FORM.status }));
  }, []);

  useEffect(() => {
    if (scanPhase !== 'review' || !capturedPhoto) return;

    let cancelled = false;
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(true);

    (async () => {
      try {
        const result = await analyzeImage(capturedPhoto, {
          mimeType: imageMimeType,
          fileName: imageFileName,
          source: captureSource,
        });
        if (!cancelled) {
          if (result.noLesionFound) {
            setAnalysisLoading(false);
            showAlert({
              title: 'No lesions detected',
              message: 'No lesions detected — you are well and healthy!',
              variant: 'success',
              buttons: [
                { text: 'OK', style: 'default', onPress: () => handleRetake() },
              ],
            });
            return;
          }
          setAnalysis(result);
          setUploadedImageUrl(result.imageUrl);
          setForm(prev => ({ ...prev, status: statusFromPrediction(result.label) }));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unable to analyze the image. Try again.';
        if (!cancelled) setAnalysisError(msg);
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [capturedPhoto, scanPhase, imageMimeType, imageFileName, captureSource, analyzeImage, retryNonce]);

  const displayLesions = useMemo(() => {
    if (!analysis?.lesions?.length) return [];
    return dedupeNestedDetections(analysis.lesions);
  }, [analysis?.lesions]);

  const carouselLesions: LesionCarouselItem[] = useMemo(
    () =>
      displayLesions.map((L, i) => ({
        ...L,
        displayIndex: i + 1,
      })),
    [displayLesions],
  );

  useEffect(() => {
    setLesionHighlight('all');
    setXaiCarouselIndex(0);
  }, [capturedPhoto, retryNonce]);

  useEffect(() => {
    if (scanPhase !== 'camera') return;
    setIsCameraReady(false);
  }, [isFacingFront, scanPhase]);

  const onLesionFilterSelect = useCallback((value: 'all' | number) => {
    if (value === 'all') {
      setLesionHighlight('all');
      return;
    }
    setLesionHighlight(value);
    setXaiCarouselIndex(value - 1);
    xaiCarouselRef.current?.scrollToLesion(value);
  }, []);

  const onXaiCarouselSlideSettled = useCallback((zeroBased: number) => {
    setXaiCarouselIndex(zeroBased);
    if (carouselDragRef.current) {
      setLesionHighlight(zeroBased + 1);
      carouselDragRef.current = false;
    }
  }, []);

  const onXaiCarouselDragStart = useCallback(() => {
    carouselDragRef.current = true;
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) {
      showAlert({ title: 'Title Required', message: 'Please enter a title to identify this lesion.', variant: 'warning' });
      return;
    }

    if (!analysis) {
      showAlert({
        title: 'Analysis pending',
        message: analysisLoading
          ? 'Please wait for analysis to finish.'
          : 'Analysis did not complete. Try Retry or take a new photo.',
        variant: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      await addLesion({ ...form, title: form.title.trim() }, uploadedImageUrl ?? capturedPhoto ?? undefined, analysis);

      // Persist title + description to the scan session so history shows them.
      if (analysis?.sessionId) {
        try {
          await apiFetch(`/scan-sessions/${encodeURIComponent(analysis.sessionId)}`, {
            method: 'PATCH',
            json: {
              title: form.title.trim(),
              ...(form.description.trim() ? { description: form.description.trim() } : {}),
            },
          });
        } catch { /* non-fatal — lesion record already saved */ }
      }

      showAlert({
        title: 'Lesion Recorded',
        message: 'Your lesion has been saved successfully and added to your records.',
        variant: 'success',
        buttons: [
          { text: 'View History', style: 'default', onPress: () => { handleRetake(); router.push('/history'); } },
          { text: 'Scan Another', style: 'cancel',  onPress: () => { handleRetake(); } },
        ],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save. Please try again.';
      showAlert({ title: 'Save Failed', message: msg, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Intro: instructions + camera / library ─────────────────────────────────
  if (scanPhase === 'intro') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {alertNode}
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ScrollView
          contentContainerStyle={[s.introScroll, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={s.introHeader}>
            <Text style={s.introTitle}>Scan a lesion</Text>
            <Text style={s.introSubtitle}>
              Follow these tips for clearer photos and more reliable results.
            </Text>
          </View>
          <View style={s.instructionsCard}>
            {CAPTURE_INSTRUCTIONS.map(line => (
              <View key={line} style={s.instructionRow}>
                <View style={s.instructionBullet} />
                <Text style={s.instructionText}>{line}</Text>
              </View>
            ))}
          </View>
          <AppButton label="Take photo" onPress={openCamera} size="lg" icon="camera" style={s.introPrimaryBtn} />
          <AppButton
            label="Choose from library"
            onPress={pickFromLibrary}
            size="lg"
            variant="secondary"
            style={s.introSecondaryBtn}
          />
        </ScrollView>
        <BottomTabBar active={activeNav} onPress={handleNav} />
      </SafeAreaView>
    );
  }

  // ── Camera permission gate (camera phase only) ─────────────────────────────
  if (scanPhase === 'camera' && !permission?.granted && !permGranted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {alertNode}
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={s.permWrap}>
          <View style={s.permIconCircle}>
            <Feather name="camera-off" size={36} color={C.textHint} />
          </View>
          <Text style={s.permTitle}>Camera Access Required</Text>
          <Text style={s.permMsg}>We need camera access to capture skin photos for analysis.</Text>
          <AppButton
            label="Grant Permission"
            onPress={async () => {
              const r = await requestPermission();
              if (r?.granted) setPermGranted(true);
            }}
            size="lg"
            style={s.permBtn}
          />
          <AppButton label="Back to instructions" onPress={() => setScanPhase('intro')} variant="secondary" size="lg" style={{ marginTop: 12, width: '100%' }} />
        </View>
        <BottomTabBar active={activeNav} onPress={handleNav} />
      </SafeAreaView>
    );
  }

  // ── Post-capture form ───────────────────────────────────────────────────────
  if (scanPhase === 'review' && capturedPhoto) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={['top']}>
        {alertNode}
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        <View style={s.formHeader}>
          <TouchableOpacity onPress={handleRetake} style={s.formBack} hitSlop={10} disabled={saving}>
            <Feather name="arrow-left" size={20} color={saving ? C.textHint : C.text} />
          </TouchableOpacity>
          <Text style={s.formHeaderTitle}>New Lesion</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.formScroll, { paddingBottom: 32 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <Text style={s.scanResultEyebrow}>Scan result</Text>

            <View style={s.photoWrap}>
              {analysisLoading ? (
                <ScanReviewLoading active />
              ) : (
                <>
                  <LesionFilterBar
                    lesionCount={displayLesions.length}
                    selected={lesionHighlight}
                    onSelect={onLesionFilterSelect}
                  />
                  <ImageWithBboxOverlay
                    source={{ uri: capturedPhoto }}
                    height={220}
                    highlightSelection={lesionHighlight}
                    detections={displayLesions.map((L, i) => ({
                      bbox: L.bbox,
                      severity: L.severity,
                      label: L.diagnosis?.label,
                      lesionNumber: i + 1,
                    }))}
                  />
                </>
              )}
              {analysis && !analysisLoading && displayLesions.length > 0 ? (
                <Text style={s.detectionHint}>
                  {displayLesions.length === 1
                    ? '1 region outlined — swipe the card for Grad-CAM on that crop.'
                    : `${displayLesions.length} regions outlined — use chips or swipe cards to focus each finding.`}
                </Text>
              ) : analysis && !analysisLoading && analysis.noLesionFound ? (
                <Text style={s.detectionHint}>No lesion-like region detected in this image.</Text>
              ) : null}
            </View>

            {analysis && !analysisLoading && carouselLesions.length > 0 ? (
              <View style={s.xaiBlock}>
                <Text style={s.xaiBlockTitle}>Model analysis & explainability</Text>
                {(() => {
                  const counts = carouselLesions.reduce(
                    (acc, L) => {
                      const k = (L.primary?.label || '').toLowerCase();
                      if (k === 'malignant') acc.malignant += 1;
                      else if (k === 'benign') acc.benign += 1;
                      return acc;
                    },
                    { malignant: 0, benign: 0 },
                  );
                  if (counts.malignant === 0 && counts.benign === 0) return null;
                  const anyMal = counts.malignant > 0;
                  return (
                    <View
                      style={[
                        s.primarySummaryBanner,
                        {
                          backgroundColor: anyMal ? C.urgentBg : C.stableBg,
                          borderColor: anyMal ? C.urgentBorder : C.stableBorder,
                        },
                      ]}>
                      <Text
                        style={[
                          s.primarySummaryText,
                          { color: anyMal ? C.urgentText : C.stableText },
                        ]}>
                        {counts.malignant > 0
                          ? `${counts.malignant} malignant`
                          : null}
                        {counts.malignant > 0 && counts.benign > 0 ? ' · ' : ''}
                        {counts.benign > 0 ? `${counts.benign} benign` : null}
                      </Text>
                    </View>
                  );
                })()}
                <LesionXaiCarousel
                  ref={xaiCarouselRef}
                  lesions={carouselLesions}
                  originalImageUrl={analysis.imageUrl ?? null}
                  wholeImage={analysis.wholeImage ?? null}
                  xaiMethod={analysis.xaiMethod}
                  onSlideIndexChange={onXaiCarouselSlideSettled}
                  onScrollDragStart={onXaiCarouselDragStart}
                />
                <View style={s.carouselMeta}>
                  <Text style={s.carouselCounter}>
                    {xaiCarouselIndex + 1} of {carouselLesions.length}
                  </Text>
                  <View style={s.dotRow}>
                    {carouselLesions.map((_, i) => (
                      <View
                        key={`dot-${i}`}
                        style={[s.dot, i === xaiCarouselIndex ? s.dotOn : s.dotOff]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            <View style={s.formCard}>
              <AppInput
                label="Title" required
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
                placeholder="Petite mole near left elbow"
                editable={!saving}
                returnKeyType="next"
              />
              <AppInput
                label="Description"
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="A few words on size, colour, edges, texture…"
                multiline editable={!saving}
              />
              <AppInput
                label="Body Location"
                value={form.location}
                onChangeText={v => setForm(f => ({ ...f, location: v }))}
                placeholder="Inner left forearm"
                editable={!saving} returnKeyType="next"
              />

              <AppInput
                label="Notes" optional
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Tenderness, sun exposure that day, anything to remember…"
                multiline editable={!saving}
              />
            </View>

            <View style={s.analysisCard}>
              <Text style={s.analysisTitle}>Session summary</Text>
              {analysisLoading ? (
                <Text style={s.analysisSubtext}>Analyzing your image…</Text>
              ) : analysisError ? (
                <View style={s.analysisErrorBlock}>
                  <Text style={s.analysisErrorText}>{analysisError}</Text>
                  <AppButton
                    label="Retry analysis"
                    onPress={handleRetryAnalysis}
                    size="md"
                    disabled={saving}
                    style={s.retryBtn}
                  />
                </View>
              ) : analysis ? (
                carouselLesions.length > 0 ? (
                  <View style={s.analysisSummary}>
                    <Text style={s.analysisSubtext}>
                      Each card above combines the classifier output and Grad-CAM for that region.
                    </Text>
                    {analysis.partialFailure ? (
                      <Text style={s.analysisEnhance}>
                        Some regions could not be fully analyzed — review cards for gaps.
                      </Text>
                    ) : null}
                    {analysis.enhancementsApplied && analysis.enhancementsApplied.length > 0 ? (
                      <Text style={[s.analysisEnhance, { marginTop: 6 }]}>
                        Enhanced: {analysis.enhancementsApplied.join(', ')}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={s.analysisSummary}>
                    <Text style={s.analysisLabel}>Triage (from prediction)</Text>
                    <Text style={s.analysisSubtext}>{statusFromPrediction(analysis.label)}</Text>
                    <Text style={[s.analysisLabel, { marginTop: 10 }]}>Prediction</Text>
                    <Text style={s.analysisValue}>{analysis.label}</Text>
                    <Text style={s.analysisSubtext}>Confidence: {(analysis.score * 100).toFixed(1)}%</Text>
                    <Text style={s.analysisSubtext}>
                      Explainability: {analysis.xaiMethod ?? 'Grad-CAM'} heatmap
                    </Text>
                    {analysis.enhancementsApplied && analysis.enhancementsApplied.length > 0 ? (
                      <Text style={s.analysisEnhance}>
                        Enhanced: {analysis.enhancementsApplied.join(', ')}
                      </Text>
                    ) : null}
                    {analysis.topPredictions && analysis.topPredictions.length > 0 ? (
                      <View style={s.topPredBlock}>
                        <Text style={s.analysisLabel}>Top classes</Text>
                        {analysis.topPredictions.map((row, i) => (
                          <Text key={`${row.label}-${i}`} style={s.topPredRow}>
                            {row.label}: {(row.score * 100).toFixed(1)}%
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {analysis.camImageUrl ? (
                      <Image source={{ uri: analysis.camImageUrl }} style={s.analysisImage} resizeMode="cover" />
                    ) : null}
                  </View>
                )
              ) : (
                <Text style={s.analysisSubtext}>Preparing analysis…</Text>
              )}
            </View>

            <AppButton
              label="Save Lesion"
              onPress={handleSave}
              loading={saving}
              disabled={saving || !analysis}
              icon="save"
              size="lg"
              style={s.saveBtn}
            />

            <Text style={s.disclaimer}>
              For tracking only. Always consult a dermatologist for medical advice.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Live camera ─────────────────────────────────────────────────────────────
  // Server bboxes are normalized against the uploaded *reticle-cropped* frame,
  // so project onto the on-screen reticle box only.
  const liveBoxes: Array<{ left: number; top: number; width: number; height: number; color: string; label: string; conf: number; key: string }> =
    (() => {
      if (!liveDetect.frameSize) return [];
      if (cameraLayout.w <= 0 || cameraLayout.h <= 0) return [];
      const { width: fw, height: fh } = liveDetect.frameSize;
      const reticleLeft = Math.max(0, (cameraLayout.w - RETICLE_SIZE) / 2);
      const reticleTop = Math.max(0, (cameraLayout.h - RETICLE_SIZE) / 2);
      const layout = containLayout(RETICLE_SIZE, RETICLE_SIZE, fw, fh);
      return liveDetect.detections.map((d: LiveDetection, i: number) => {
        const r = bboxToOverlayRect(d.bbox, layout);
        return {
          left: reticleLeft + r.left,
          top: reticleTop + r.top,
          width: Math.max(1, r.width),
          height: Math.max(1, r.height),
          color: liveSeverityColor(d.cls),
          label: d.cls,
          conf: d.bbox.conf ?? 0,
          key: `live-${i}-${d.bbox.x1.toFixed(1)}-${d.bbox.y1.toFixed(1)}`,
        };
      });
    })();

  return (
    <View
      style={s.cameraRoot}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setCameraLayout({ w: width, h: height });
      }}>
      {alertNode}
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={isFacingFront ? 'front' : 'back'}
        mode="picture"
        enableTorch={!isFacingFront && torchOn}
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={event => {
          setIsCameraReady(false);
          showAlert({
            title: 'Camera',
            message: event.message ?? 'Could not start the camera preview.',
            variant: 'error',
          });
        }}
      />

      {/* Centered framing reticle + caption — Live & Scan share this affordance */}
      <View pointerEvents="none" style={s.reticleWrap}>
        <View style={s.reticleBox} />
        <Text style={s.reticleCaption}>{RETICLE_CAPTION}</Text>
      </View>

      {/* Live bbox overlays — rendered whenever detections present */}
      {liveBoxes.length > 0 ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {liveBoxes.map(box => (
            <View
              key={box.key}
              style={[
                s.liveBox,
                {
                  left: box.left - 2,
                  top: box.top - 2,
                  width: box.width + 4,
                  height: box.height + 4,
                  borderColor: box.color,
                  shadowColor: box.color,
                },
              ]}>
              <View style={[s.liveBoxLabelWrap, { backgroundColor: box.color }]}>
                <Text style={s.liveBoxLabelTxt} numberOfLines={1}>
                  {box.label} {(box.conf * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Detection status pill — always visible while camera screen open.
          Drives off live detector state so text + color stay in sync with
          the actual /detect-fast stream instead of a hardcoded label. */}
      {scanPhase === 'camera' && !liveDetect.offline ? (
        <View
          pointerEvents="none"
          style={[
            s.liveStatusPill,
            { top: insets.top + 72 },
            liveBoxes.length > 0
              ? s.liveStatusPillDetected
              : isCameraReady && liveDetect.lastMs != null
                ? s.liveStatusPillHealthy
                : s.liveStatusPillScanning,
          ]}>
          <Text
            style={[
              s.liveStatusTxt,
              liveBoxes.length > 0
                ? s.liveStatusTxtDetected
                : isCameraReady && liveDetect.lastMs != null
                  ? s.liveStatusTxtHealthy
                  : s.liveStatusTxtScanning,
            ]}>
            {liveBoxes.length > 0
              ? (() => {
                  const top = liveBoxes.reduce(
                    (m, b) => (b.conf > m.conf ? b : m),
                    liveBoxes[0],
                  );
                  return `Lesion Detected (${liveBoxes.length}) · ${top.label} ${(top.conf * 100).toFixed(0)}% — tap shutter`;
                })()
              : isCameraReady && liveDetect.lastMs != null
                ? `Scanning live · clear (${liveDetect.lastMs.toFixed(0)} ms)`
                : isCameraReady
                  ? 'Scanning… place lesion inside the box'
                  : 'Starting camera…'}
          </Text>
        </View>
      ) : null}

      <View style={[s.camTopBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.camCircleBtn}
          onPress={() => setScanPhase('intro')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close camera">
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={s.camTopRight}>
          <TouchableOpacity
            style={s.camCircleBtn}
            onPress={() => (!isFacingFront ? setTorchOn(v => !v) : undefined)}
            activeOpacity={0.8}
            disabled={isFacingFront}
            accessibilityRole="button"
            accessibilityLabel={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
            accessibilityHint={isFacingFront ? 'Switch to main camera for the flashlight.' : undefined}>
            <Feather
              name="zap"
              size={22}
              color={!isFacingFront && torchOn ? '#fbbf24' : '#fff'}
              style={{ opacity: isFacingFront ? 0.35 : 1 }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.camCircleBtn}
            onPress={() =>
              setIsFacingFront(v => {
                const next = !v;
                if (next) setTorchOn(false);
                return next;
              })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Flip camera">
            <Feather name="refresh-cw" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline banner */}
      {liveDetect.offline ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setScanPhase('intro')}
          style={[s.offlineBanner, { top: insets.top + 72 }]}
          accessibilityRole="button"
          accessibilityLabel="Offline. Tap to return to camera intro.">
          <Feather name="wifi-off" size={14} color={C.urgentText} />
          <Text style={s.offlineBannerTxt}>Offline — tap to return to intro</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[s.camBottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={s.camBottomRow}>
          <TouchableOpacity
            style={s.camCircleBtn}
            onPress={pickFromLibrary}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Upload photo from library">
            <Feather name="image" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={s.camShutter}>
            <View pointerEvents="none" style={s.crosshairRing} />
            <View pointerEvents="none" style={[s.crosshairTick, s.tickTop]} />
            <View pointerEvents="none" style={[s.crosshairTick, s.tickRight]} />
            <View pointerEvents="none" style={[s.crosshairTick, s.tickBottom]} />
            <View pointerEvents="none" style={[s.crosshairTick, s.tickLeft]} />
            <TouchableOpacity
              style={[s.camShutterBtn, (!isCameraReady || captureBusy) && s.camShutterDisabled]}
              onPress={handleTakePhoto}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Capture photo"
              accessibilityState={{ disabled: !isCameraReady || captureBusy }}
              disabled={!isCameraReady || captureBusy}
              hitSlop={12}>
              {captureBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={s.camShutterInner} />
              )}
            </TouchableOpacity>
          </View>

          {/* Spacer mirrors the upload button so the shutter stays centered */}
          <View style={s.camCircleBtnSpacer} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  introScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  introHeader: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 26,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 15,
    fontFamily: FontFamily.body,
    color: C.textHint,
    lineHeight: 22,
  },
  instructionsCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 22,
    ...(Platform.OS === 'ios' ? Shadow.xs : {}),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  instructionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
    marginTop: 7,
    opacity: 0.85,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: C.text,
    lineHeight: 22,
  },
  introPrimaryBtn: { width: '100%', marginBottom: 12 },
  introSecondaryBtn: { width: '100%' },

  // Permission (camera phase)
  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  permIconCircle: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  permTitle: {
    fontSize: 24,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  permMsg: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: C.textHint,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  permBtn:   { width: '100%' },

  // Form
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  formBack: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  formHeaderTitle: {
    fontSize: 17,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.3,
  },
  formScroll: { paddingHorizontal: 16, paddingTop: 16 },
  scanResultEyebrow: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  photoWrap: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'stretch',
  },
  detectionHint: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: C.textHint,
    lineHeight: 19,
  },
  xaiBlock: {
    marginBottom: 16,
  },
  xaiBlockTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    marginBottom: 10,
  },
  primarySummaryBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  primarySummaryText: {
    fontSize: 13,
    fontFamily: FontFamily.displayBold,
    letterSpacing: 0.5,
  },
  carouselMeta: {
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  carouselCounter: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    color: C.textHint,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOn: {
    backgroundColor: C.primary,
  },
  dotOff: {
    backgroundColor: C.border,
  },
  formCard: {
    backgroundColor: C.surface, borderRadius: 22,
    padding: 18, borderWidth: 1, borderColor: C.border,
    marginBottom: 16,
    ...(Platform.OS === 'ios' ? Shadow.xs : {}),
  },
  analysisCard: {
    backgroundColor: C.surface, borderRadius: 22,
    borderWidth: 1, borderColor: C.border,
    padding: 18, marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    marginBottom: 12,
  },
  analysisSummary: {
    gap: 12,
  },
  analysisLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemibold,
    color: C.textHint,
  },
  analysisValue: {
    fontSize: 18,
    fontFamily: FontFamily.displayBold,
    color: C.text,
  },
  analysisSubtext: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },
  analysisEnhance: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: C.text,
    marginTop: 2,
  },
  topPredBlock: {
    marginTop: 4,
    gap: 4,
  },
  topPredRow: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },
  analysisImage: {
    width: '100%',
    height: 170,
    borderRadius: 18,
    marginTop: 8,
    backgroundColor: C.surfaceAlt,
  },
  analysisErrorBlock: {
    gap: 12,
  },
  analysisErrorText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: C.urgentText,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  saveBtn:    { marginBottom: 14 },
  disclaimer: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },

  // Camera
  cameraRoot: { flex: 1, backgroundColor: '#000' },
  camTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  camCircleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Overlay.scrimStrong,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Overlay.whiteFaint,
  },
  camTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  camHintPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Overlay.photoHintPillBg,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
    borderWidth: 1, borderColor: Overlay.whiteFaint,
  },
  camHintTxt: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Overlay.whiteAlmost,
    letterSpacing: 0.3,
  },
  reticleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  reticleBox: {
    width: 220,
    height: 220,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Overlay.whiteSoft,
    backgroundColor: 'transparent',
  },
  reticleCaption: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Overlay.whiteAlmost,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  liveBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: Radius.xs,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  liveBoxLabelWrap: {
    position: 'absolute',
    top: -18,
    left: -1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: Radius.xs,
    borderTopRightRadius: Radius.xs,
    maxWidth: 240,
  },
  liveBoxLabelTxt: {
    color: '#fff',
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
  },
  liveStatusPill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  liveStatusPillScanning: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  liveStatusPillHealthy: {
    backgroundColor: C.stableBg,
    borderColor: C.stableBorder,
  },
  liveStatusPillDetected: {
    backgroundColor: C.urgentBg,
    borderColor: C.urgentBorder,
  },
  liveStatusTxt: {
    fontSize: 13,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.3,
  },
  liveStatusTxtScanning: {
    color: '#fff',
  },
  liveStatusTxtHealthy: {
    color: C.stableText,
  },
  liveStatusTxtDetected: {
    color: C.urgentText,
  },
  offlineBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.urgentBg,
    borderColor: C.urgentBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    minHeight: 36,
  },
  offlineBannerTxt: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemibold,
    color: C.urgentText,
    letterSpacing: 0.2,
  },
  camBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 32,
  },
  camCircleBtnSpacer: {
    width: 46,
    height: 46,
  },
  camShutterInnerLive: {
    backgroundColor: C.primary,
  },
  camBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    backgroundColor: Overlay.photoBarBg,
    paddingTop: 20,
  },
  camShutter: {
    alignItems: 'center', justifyContent: 'center',
    width: 124, height: 124,
  },
  crosshairRing: {
    position: 'absolute',
    width: 116, height: 116, borderRadius: 58,
    borderWidth: 1.25,
    borderColor: Overlay.whiteMuted,
  },
  crosshairTick: {
    position: 'absolute',
    width: 1.5, height: 12,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  tickTop:    { top: -2 },
  tickBottom: { bottom: -2 },
  tickLeft:   { left: -2,  width: 12, height: 1.5 },
  tickRight:  { right: -2, width: 12, height: 1.5 },
  camShutterBtn: {
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 3, borderColor: '#fff',
    backgroundColor: Overlay.whiteGhost,
    alignItems: 'center', justifyContent: 'center',
  },
  camShutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  camShutterDisabled: { opacity: 0.45 },
});
