import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { C, FontFamily, FontSize, Gradient, Radius, Shadow, Space } from '@/constants/theme';
import { Hairline } from '@/components/decor/Hairline';
import { StatusArc } from '@/components/decor/StatusArc';
import { ImageWithBboxOverlay } from '@/components/ImageWithBboxOverlay';
import { fetchScanSessionById, type ScanSession } from '@/hooks/useScanSessions';
import { ApiError } from '@/lib/api';
type StatusKey = 'Stable' | 'Check' | 'Urgent';

function mapModelSeverityToStatus(s?: string): StatusKey {
  const k = (s || '').toLowerCase();
  if (k === 'urgent') return 'Urgent';
  if (k === 'stable') return 'Stable';
  return 'Check';
}

const statusMeta: Record<StatusKey, { label: string; color: string; bg: string }> = {
  Stable: { label: 'Stable', color: C.stableText, bg: C.stableBg },
  Check: { label: 'Check', color: C.checkText, bg: C.checkBg },
  Urgent: { label: 'Urgent', color: C.urgentText, bg: C.urgentBg },
};

export default function ScanSessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<ScanSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapUri, setHeatmapUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setError('Missing session id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const doc = await fetchScanSessionById(id);
      setSession(doc);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 404
            ? 'This session was not found.'
            : e.message
          : (e as Error).message;
      setError(msg);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const regions = session?.lesions ?? [];
  const arcStatus = mapModelSeverityToStatus(regions[0]?.severity);
  const detections = regions
    .filter((L): L is typeof L & { bbox: NonNullable<typeof L.bbox> } => L.bbox != null)
    .map((L) => ({
      bbox: L.bbox,
      severity: L.severity,
      label: L.diagnosis?.label,
    }));
  const primaryHeatmap =
    session?.annotatedImageUrl || regions.find((l) => l.overlayImageUrl)?.overlayImageUrl;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>
          Session results
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingTxt}>Loading session…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <View style={s.errorTile}>
            <Feather name="alert-circle" size={28} color={C.urgentText} />
          </View>
          <Text style={s.errorTitle}>Could not load session</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => void load()} activeOpacity={0.85}>
            <Text style={s.retryBtnTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : session ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[...Gradient.surfaceTint]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroBand}>
            <Text style={s.heroEyebrow}>Scan session</Text>
            <Text style={s.heroTitle}>
              {session.lesionCount || regions.length}{' '}
              {session.lesionCount === 1 || regions.length === 1 ? 'region' : 'regions'}
            </Text>
            <Text style={s.heroSub}>
              {new Date(session.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>
          </LinearGradient>

          <View style={s.hairlineWrap}>
            <Hairline width="100%" fadeInset={0} />
          </View>

          <View style={s.heroCard}>
            <StatusArc status={arcStatus} edge="left" length={'100%'} thickness={4} />
            {session.originalImageUrl && detections.length > 0 ? (
              <View style={s.photoBlock}>
                <Text style={s.blockLabel}>Capture with outlines</Text>
                <ImageWithBboxOverlay
                  source={{ uri: session.originalImageUrl }}
                  height={240}
                  borderRadius={Radius.lg}
                  detections={detections}
                />
              </View>
            ) : session.originalImageUrl ? (
              <View style={s.photoBlock}>
                <Text style={s.blockLabel}>Original capture</Text>
                <Image
                  source={{ uri: session.originalImageUrl }}
                  style={s.fullImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <View style={s.metaGrid}>
              <View style={s.metaChip}>
                <Text style={s.metaChipLbl}>Status</Text>
                <Text style={s.metaChipVal}>
                  {session.noLesionFound ? 'No detection' : session.partialFailure ? 'Partial' : 'Analyzed'}
                </Text>
              </View>
              {session.qualityMetadata?.enhancements_applied &&
              session.qualityMetadata.enhancements_applied.length > 0 ? (
                <View style={s.metaChipWide}>
                  <Text style={s.metaChipLbl}>Enhancements</Text>
                  <Text style={s.metaChipValSmall}>
                    {session.qualityMetadata.enhancements_applied.join(', ')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {primaryHeatmap ? (
            <TouchableOpacity
              style={s.heatmapCard}
              onPress={() => setHeatmapUri(primaryHeatmap)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Open Grad-CAM heatmap full screen">
              <View style={s.heatmapCardHead}>
                <Feather name="zap" size={16} color={C.primary} />
                <Text style={s.heatmapCardTitle}>Grad-CAM heatmap</Text>
                <Feather name="maximize-2" size={14} color={C.textHint} />
              </View>
              <Image source={{ uri: primaryHeatmap }} style={s.heatmapThumb} resizeMode="cover" />
              <Text style={s.heatmapHint}>Tap to view full size</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={s.sectionTitle}>Per-region findings</Text>
          {regions.length === 0 ? (
            <View style={s.emptyRegions}>
              <Text style={s.emptyRegionsTxt}>
                {session.noLesionFound
                  ? 'No lesion-like region was detected for this capture.'
                  : 'No per-region records were stored.'}
              </Text>
            </View>
          ) : (
            regions.map((L, i) => {
              const st = mapModelSeverityToStatus(L.severity);
              const meta = statusMeta[st];
              const label = L.diagnosis?.label ?? '—';
              const score = typeof L.diagnosis?.score === 'number' ? L.diagnosis.score : 0;
              return (
                <View key={L.lesionId ?? `r-${i}`} style={s.regionCard}>
                  <View style={s.regionTop}>
                    <Text style={s.regionName}>Region {i + 1}</Text>
                    <View style={[s.sevPill, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                      <Text style={[s.sevPillTxt, { color: meta.color }]}>{st}</Text>
                    </View>
                  </View>
                  <Text style={s.regionPred}>
                    {label} · {(score * 100).toFixed(1)}%
                  </Text>
                  <Text style={s.regionMeta}>
                    Detector conf: {((L.bbox?.conf ?? 0) * 100).toFixed(1)}%
                  </Text>
                  {(L.cropImageUrl || L.overlayImageUrl) && (
                    <View style={s.regionThumbs}>
                      {L.cropImageUrl ? (
                        <Image source={{ uri: L.cropImageUrl }} style={s.regionThumb} resizeMode="cover" />
                      ) : null}
                      {L.overlayImageUrl ? (
                        <Image source={{ uri: L.overlayImageUrl }} style={s.regionThumb} resizeMode="cover" />
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: Space[8] }} />
        </ScrollView>
      ) : null}

      <Modal
        visible={!!heatmapUri}
        animationType="fade"
        transparent
        onRequestClose={() => setHeatmapUri(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Grad-CAM</Text>
              <TouchableOpacity
                onPress={() => setHeatmapUri(null)}
                style={s.modalClose}
                hitSlop={8}
                accessibilityRole="button">
                <Feather name="x" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            {heatmapUri ? (
              <Image source={{ uri: heatmapUri }} style={s.modalImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[4],
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Space[10], paddingHorizontal: Space[5] },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space[6],
  },
  loadingTxt: {
    marginTop: 12,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
  },
  errorTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.urgentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    marginBottom: 6,
  },
  errorMsg: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
  retryBtnTxt: {
    color: C.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
  },
  heroBand: {
    marginTop: Space[3],
    paddingHorizontal: Space[5],
    paddingVertical: Space[5],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Shadow.xs,
  },
  heroEyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.floralSage,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
  },
  hairlineWrap: { marginVertical: Space[3] },
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: Space[4],
    position: 'relative',
    ...Shadow.sm,
  },
  photoBlock: { padding: Space[4] },
  blockLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.textSub,
    marginBottom: 10,
  },
  fullImage: {
    width: '100%',
    height: 240,
    borderRadius: Radius.lg,
    backgroundColor: C.surfaceAlt,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: Space[4],
    paddingBottom: Space[4],
  },
  metaChip: {
    backgroundColor: C.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  metaChipWide: {
    flexBasis: '100%',
    backgroundColor: C.floralSageSoft,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.borderSage,
  },
  metaChipLbl: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaChipVal: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
  },
  metaChipValSmall: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: C.text,
    lineHeight: 20,
  },
  heatmapCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Space[4],
    marginBottom: Space[4],
    ...Shadow.sm,
  },
  heatmapCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  heatmapCardTitle: {
    flex: 1,
    fontSize: FontSize.base,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
  },
  heatmapThumb: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: C.surfaceAlt,
  },
  heatmapHint: {
    marginTop: 8,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  emptyRegions: {
    padding: Space[5],
    backgroundColor: C.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  emptyRegionsTxt: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 20,
    textAlign: 'center',
  },
  regionCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: Space[4],
    marginBottom: 10,
    ...(Platform.OS === 'ios' ? Shadow.xs : {}),
  },
  regionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  regionName: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
  },
  sevPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sevPillTxt: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyBold },
  regionPred: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
  },
  regionMeta: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginTop: 6,
  },
  regionThumbs: { flexDirection: 'row', gap: 8, marginTop: 10 },
  regionThumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: C.surfaceAlt,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
  },
  modalImage: {
    width: '100%',
    height: 360,
    borderRadius: Radius.md,
    backgroundColor: C.surfaceAlt,
  },
});
