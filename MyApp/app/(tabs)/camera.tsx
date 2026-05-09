import { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Platform, Image,
  ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C, FontFamily, Shadow, Overlay, Radius } from '@/constants/theme';
import { useLesions, type LesionFields, type AnalyzeImageResult } from '@/hooks/useLesions';
import { ImageWithBboxOverlay } from '@/components/ImageWithBboxOverlay';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';
import { useAppAlert } from '@/components/ui/AppAlert';
import { laplacianVarianceForImageUri, LAPLACIAN_VARIANCE_THRESHOLD } from '@/lib/imageSharpness';
import { statusFromPrediction } from '@/lib/lesionSeverity';

type TriageKey = 'Stable' | 'Check' | 'Urgent';

function mapModelSeverityToTriage(s?: string): TriageKey {
  const k = (s || '').toLowerCase();
  if (k === 'urgent') return 'Urgent';
  if (k === 'stable') return 'Stable';
  return 'Check';
}

const triageStyle: Record<TriageKey, { bg: string; color: string; border: string }> = {
  Stable: { bg: C.stableBg, color: C.stableText, border: C.stableBorder },
  Check:  { bg: C.checkBg,  color: C.checkText,  border: C.checkBorder },
  Urgent: { bg: C.urgentBg, color: C.urgentText, border: C.urgentBorder },
};

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

type ScanPhase = 'intro' | 'camera' | 'review';

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
  const cameraRef = useRef<CameraView>(null);
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { addLesion, analyzeImage } = useLesions();
  const { token } = useAuth();
  const { showAlert, alertNode } = useAppAlert();

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
  };

  /** Show blur warning only; allow analysis to proceed for testing. */
  const ensureSharpEnough = useCallback(
    async (uri: string): Promise<boolean> => {
      try {
        const variance = await laplacianVarianceForImageUri(uri);
        if (variance < LAPLACIAN_VARIANCE_THRESHOLD) {
          showAlert({
            title: 'Image looks blurry',
            message:
              'This photo may be blurry, but it will still be analyzed so you can test model behavior.',
            variant: 'warning',
          });
          return true;
        }
        return true;
      } catch {
        /** Manipulator / decode failure should not block capture */
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
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        showAlert({
          title: 'Camera access',
          message: 'Camera permission is needed to take a lesion photo.',
          variant: 'warning',
        });
        return;
      }
    }
    setIsFacingFront(false);
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
    const ok = await ensureSharpEnough(uri);
    if (!ok) return;
    setCapturedPhoto(uri);
    setScanPhase('review');
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
    if (photo?.uri) {
      const ok = await ensureSharpEnough(photo.uri);
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
      setCapturedPhoto(photo.uri);
      setScanPhase('review');
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
  if (scanPhase === 'camera' && !permission?.granted) {
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
          <AppButton label="Grant Permission" onPress={requestPermission} size="lg" style={s.permBtn} />
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

            <View style={s.photoWrap}>
              <ImageWithBboxOverlay
                source={{ uri: capturedPhoto }}
                height={220}
                detections={(analysis?.lesions ?? []).map((L) => ({
                  bbox: L.bbox,
                  severity: L.severity,
                  label: L.diagnosis?.label,
                }))}
              />
              {analysis && !analysisLoading && (analysis.lesions?.length ?? 0) > 0 ? (
                <Text style={s.detectionHint}>
                  {analysis.lesions!.length === 1
                    ? '1 region outlined — matches model view.'
                    : `${analysis.lesions!.length} regions outlined — review each finding below.`}
                </Text>
              ) : analysis && !analysisLoading && analysis.noLesionFound ? (
                <Text style={s.detectionHint}>No lesion-like region detected in this image.</Text>
              ) : null}
            </View>

            {analysis && !analysisLoading && (analysis.lesions?.length ?? 0) > 0 ? (
              <View style={s.regionList}>
                <Text style={s.regionListTitle}>Regions detected</Text>
                {analysis.lesions!.map((L, i) => {
                  const tri = mapModelSeverityToTriage(L.severity);
                  const meta = triageStyle[tri];
                  const label = L.diagnosis?.label ?? '—';
                  const score = typeof L.diagnosis?.score === 'number' ? L.diagnosis.score : 0;
                  return (
                    <View key={L.lesion_id ?? `reg-${i}`} style={s.regionCard}>
                      <View style={s.regionCardTop}>
                        <Text style={s.regionCardHeading}>Region {i + 1}</Text>
                        <View style={[s.regionTriagePill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                          <Text style={[s.regionTriageTxt, { color: meta.color }]}>{tri}</Text>
                        </View>
                      </View>
                      <Text style={s.regionCardPred}>
                        {label} · {(score * 100).toFixed(1)}%
                      </Text>
                      <Text style={s.regionCardMeta}>
                        Box conf: {((L.bbox?.conf ?? 0) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  );
                })}
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
              <Text style={s.analysisTitle}>Model analysis</Text>
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
                <View style={s.analysisSummary}>
                  <Text style={s.analysisLabel}>Triage (from prediction)</Text>
                  <Text style={s.analysisSubtext}>{statusFromPrediction(analysis.label)}</Text>
                  <Text style={[s.analysisLabel, { marginTop: 10 }]}>Prediction</Text>
                  <Text style={s.analysisValue}>{analysis.label}</Text>
                  <Text style={s.analysisSubtext}>Confidence: {(analysis.score * 100).toFixed(1)}%</Text>
                  <Text style={s.analysisSubtext}>
                    Explainability: {analysis.xaiMethod ?? 'Score-CAM'} heatmap
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
  return (
    <View style={s.cameraRoot}>
      {alertNode}
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={isFacingFront ? 'front' : 'back'}
        ratio="16:9"
        enableTorch={!isFacingFront && torchOn}
      />

        <View style={[s.camTopBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.camCircleBtn} onPress={() => setScanPhase('intro')} activeOpacity={0.8}>
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.camHintPill}>
          <Feather name="crosshair" size={13} color={Overlay.whiteAlmost} />
          <Text style={s.camHintTxt}>Align lesion in frame</Text>
        </View>
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
            accessibilityLabel="Flip camera">
            <Feather name="refresh-cw" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[s.camBottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={s.camShutter}>
          <View pointerEvents="none" style={s.crosshairRing} />
          <View pointerEvents="none" style={[s.crosshairTick, s.tickTop]} />
          <View pointerEvents="none" style={[s.crosshairTick, s.tickRight]} />
          <View pointerEvents="none" style={[s.crosshairTick, s.tickBottom]} />
          <View pointerEvents="none" style={[s.crosshairTick, s.tickLeft]} />
          <TouchableOpacity
            style={s.camShutterBtn}
            onPress={handleTakePhoto}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            hitSlop={12}>
            <View style={s.camShutterInner} />
          </TouchableOpacity>
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
  regionList: {
    marginBottom: 16,
    gap: 10,
  },
  regionListTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  regionCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  regionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  regionCardHeading: {
    fontSize: 15,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
  },
  regionTriagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  regionTriageTxt: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.3,
  },
  regionCardPred: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
  },
  regionCardMeta: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginTop: 4,
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
});
