import React, { useCallback, useEffect, useState } from 'react';
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
  KeyboardAvoidingView,
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
import { ApiError, apiFetch } from '@/lib/api';
import { dedupeNestedDetections } from '@/lib/bboxDedupe';
import { AppInput } from '@/components/ui/AppInput';
import { useAppAlert } from '@/components/ui/AppAlert';
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
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Region image');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const { showAlert, alertNode } = useAppAlert();

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setError('Missing scan id');
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
            ? 'This scan was not found.'
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

  const hasUserTitle = !!(session?.title || '').trim();

  // Auto-prompt for a name the first time the user lands on an untitled scan
  // that has lesions (skip "no lesion" cases where the default text is fine).
  useEffect(() => {
    if (!session || loading) return;
    if (hasUserTitle) return;
    if (session.noLesionFound) return;
    if (renaming) return;
    setTitleDraft('');
    setRenaming(true);
    // Only auto-open once per session load; subsequent renames go through the
    // pencil button.
  }, [session?._id, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRename = useCallback(() => {
    setTitleDraft((session?.title || '').trim());
    setRenaming(true);
  }, [session?.title]);

  const submitRename = useCallback(async () => {
    if (!session) return;
    const next = titleDraft.trim();
    if (!next) return;
    setSavingTitle(true);
    try {
      const updated = await apiFetch<ScanSession>(
        `/scan-sessions/${encodeURIComponent(session._id)}`,
        { method: 'PATCH', json: { title: next } },
      );
      setSession((prev) => (prev ? { ...prev, ...updated, title: updated.title ?? next } : prev));
      setRenaming(false);
    } catch (e) {
      showAlert({
        title: 'Rename failed',
        message: (e as Error).message || 'Could not rename this scan.',
        variant: 'error',
      });
    } finally {
      setSavingTitle(false);
    }
  }, [session, titleDraft, showAlert]);

  const regionsRaw = session?.lesions ?? [];
  const regions = dedupeNestedDetections(
    regionsRaw.filter((L): L is typeof L & { bbox: NonNullable<typeof L.bbox> } => L.bbox != null),
  );
  const arcStatus = mapModelSeverityToStatus(regions[0]?.severity ?? regionsRaw[0]?.severity);
  const detections = regions
    .filter((L): L is typeof L & { bbox: NonNullable<typeof L.bbox> } => L.bbox != null)
    .map((L) => ({
      bbox: L.bbox,
      severity: L.severity,
      label: L.diagnosis?.label,
    }));
  const wholeImageOverlay = session?.wholeImage?.overlayImageUrl ?? null;
  const primaryHeatmap =
    wholeImageOverlay ||
    session?.annotatedImageUrl ||
    regions[0]?.overlayImageUrl ||
    regionsRaw.find((l) => l.overlayImageUrl)?.overlayImageUrl;
  const wholeImage = session?.wholeImage ?? null;
  const wholeSpecialistLabel =
    wholeImage?.specialist?.display ??
    wholeImage?.specialist?.label ??
    wholeImage?.diagnosis?.display ??
    wholeImage?.diagnosis?.label ??
    null;
  const wholeScorePct =
    typeof wholeImage?.specialist?.score === 'number'
      ? `${(wholeImage.specialist.score * 100).toFixed(1)}%`
      : typeof wholeImage?.diagnosis?.score === 'number'
      ? `${(wholeImage.diagnosis.score * 100).toFixed(1)}%`
      : null;
  const wholePrimaryKey = (wholeImage?.primary?.label || '').toLowerCase();
  const wholeIsMalignant = wholePrimaryKey === 'malignant';
  const wholePrimaryDisplay =
    wholeImage?.primary?.display ?? (wholeIsMalignant ? 'Malignant' : wholePrimaryKey ? 'Benign' : null);
  const wholePrimaryScorePct =
    typeof wholeImage?.primary?.score === 'number'
      ? `${(wholeImage.primary.score * 100).toFixed(0)}%`
      : null;
  const wholePrimaryMeta = wholeIsMalignant ? statusMeta.Urgent : statusMeta.Stable;

  const sessionTitle = session
    ? (session.title || '').trim() ||
      (session.noLesionFound ? 'No lesion detected' : 'Untitled scan')
    : 'Scan';

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
        <TouchableOpacity
          style={s.topTitleWrap}
          onPress={openRename}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={hasUserTitle ? `Rename scan ${sessionTitle}` : 'Name this scan'}
          disabled={!session}>
          <Text style={s.topTitle} numberOfLines={1}>
            {sessionTitle}
          </Text>
          {session ? (
            <Feather
              name="edit-2"
              size={13}
              color={hasUserTitle ? C.textHint : C.primary}
              style={s.topTitleIcon}
            />
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={s.renameBtn}
          onPress={openRename}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Rename scan"
          disabled={!session}>
          <Feather name="edit-3" size={18} color={session ? C.primary : C.textHint} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingTxt}>Loading scan…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <View style={s.errorTile}>
            <Feather name="alert-circle" size={28} color={C.urgentText} />
          </View>
          <Text style={s.errorTitle}>Could not load scan</Text>
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
            <Text style={s.heroEyebrow}>Scan report</Text>
            <Text style={s.heroTitle}>
              {regions.length || session.lesionCount || 0}{' '}
              {regions.length === 1 || session.lesionCount === 1 ? 'region' : 'regions'}
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
                <ImageWithBboxOverlay
                  source={{ uri: session.originalImageUrl }}
                  height={240}
                  borderRadius={Radius.lg}
                  detections={[]}
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

          {wholeImage ? (
            <View style={s.wholeCard}>
              <View style={s.heatmapCardHead}>
                <Feather name="layers" size={16} color={C.primary} />
                <Text style={s.heatmapCardTitle}>Whole-image diagnosis</Text>
              </View>
              {wholePrimaryDisplay ? (
                <View
                  style={[
                    s.primaryBanner,
                    { backgroundColor: wholePrimaryMeta.bg, borderColor: wholePrimaryMeta.color },
                  ]}>
                  <Text style={[s.primaryBannerLabel, { color: wholePrimaryMeta.color }]}>
                    {wholePrimaryDisplay.toUpperCase()}
                  </Text>
                  {wholePrimaryScorePct ? (
                    <Text style={[s.primaryBannerScore, { color: wholePrimaryMeta.color }]}>
                      {wholePrimaryScorePct}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {wholeSpecialistLabel ? (
                <Text style={s.regionPred}>
                  {wholeSpecialistLabel}
                  {wholeScorePct ? ` · ${wholeScorePct}` : ''}
                </Text>
              ) : null}
              {wholeImageOverlay ? (
                <TouchableOpacity
                  style={s.wholeOverlayBtn}
                  onPress={() => setHeatmapUri(wholeImageOverlay)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Open whole-image Grad-CAM heatmap full screen">
                  <View style={s.heatmapCardHead}>
                    <Feather name="zap" size={14} color={C.primary} />
                    <Text style={[s.regionImageLbl, { color: C.primary }]}>Whole-image XAI</Text>
                    <Feather name="maximize-2" size={12} color={C.textHint} />
                  </View>
                  <Image
                    source={{ uri: wholeImageOverlay }}
                    style={s.heatmapThumb}
                    resizeMode="contain"
                  />
                  <Text style={s.heatmapHint}>Tap to view full size</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : primaryHeatmap ? (
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
              <Image source={{ uri: primaryHeatmap }} style={s.heatmapThumb} resizeMode="contain" />
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
              const specialist = L.specialist;
              const specialistLabel =
                specialist?.display ?? specialist?.label ?? L.diagnosis?.display ?? L.diagnosis?.label ?? '—';
              const score =
                typeof specialist?.score === 'number'
                  ? specialist.score
                  : typeof L.diagnosis?.score === 'number'
                  ? L.diagnosis.score
                  : 0;
              const topK = Array.isArray(specialist?.top_k)
                ? specialist!.top_k!
                : Array.isArray(L.diagnosis?.top_k)
                ? L.diagnosis!.top_k!
                : [];
              const primary = L.primary;
              const primaryKey = (primary?.label || '').toLowerCase();
              const isMalignant = primaryKey === 'malignant';
              const primaryMeta = isMalignant ? statusMeta.Urgent : statusMeta.Stable;
              const primaryDisplay =
                primary?.display ?? (isMalignant ? 'Malignant' : primaryKey ? 'Benign' : null);
              const primaryScorePct =
                typeof primary?.score === 'number' ? `${(primary.score * 100).toFixed(0)}%` : null;
              const regionTitle = `Region ${i + 1}`;
              return (
                <View key={L.lesionId ?? `r-${i}`} style={s.regionCard}>
                  <View style={s.regionTop}>
                    <Text style={s.regionName}>{regionTitle}</Text>
                    <View style={[s.sevPill, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                      <Text style={[s.sevPillTxt, { color: meta.color }]}>{st}</Text>
                    </View>
                  </View>
                  {primaryDisplay ? (
                    <View
                      style={[
                        s.primaryBanner,
                        { backgroundColor: primaryMeta.bg, borderColor: primaryMeta.color },
                      ]}>
                      <Text style={[s.primaryBannerLabel, { color: primaryMeta.color }]}>
                        {primaryDisplay.toUpperCase()}
                      </Text>
                      {primaryScorePct ? (
                        <Text style={[s.primaryBannerScore, { color: primaryMeta.color }]}>
                          {primaryScorePct}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={s.regionPred}>
                    {specialistLabel} · {(score * 100).toFixed(1)}%
                  </Text>
                  <Text style={s.regionMeta}>
                    Detector conf: {((L.bbox?.conf ?? 0) * 100).toFixed(1)}%
                  </Text>

                  {(L.cropImageUrl || L.overlayImageUrl) && (
                    <View style={s.regionImageRow}>
                      {L.cropImageUrl ? (
                        <TouchableOpacity
                          style={s.regionImageBlock}
                          activeOpacity={0.85}
                          onPress={() => {
                            setPreviewTitle(`${regionTitle} · detected lesion`);
                            setPreviewUri(L.cropImageUrl!);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Open detected lesion image for ${regionTitle}`}>
                          <View style={s.regionImageHeadRow}>
                            <Feather name="image" size={12} color={C.textSub} />
                            <Text style={s.regionImageLbl}>Detected lesion</Text>
                          </View>
                          <Image
                            source={{ uri: L.cropImageUrl }}
                            style={s.regionImageLarge}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : null}
                      {L.overlayImageUrl ? (
                        <TouchableOpacity
                          style={s.regionImageBlock}
                          activeOpacity={0.85}
                          onPress={() => {
                            setPreviewTitle(`${regionTitle} · XAI heatmap`);
                            setPreviewUri(L.overlayImageUrl!);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Open XAI heatmap for ${regionTitle}`}>
                          <View style={s.regionImageHeadRow}>
                            <Feather name="zap" size={12} color={C.primary} />
                            <Text style={[s.regionImageLbl, { color: C.primary }]}>XAI heatmap</Text>
                          </View>
                          <Image
                            source={{ uri: L.overlayImageUrl }}
                            style={s.regionImageLarge}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                  {topK.length > 0 ? (
                    <View style={s.topKBlock}>
                      <Text style={s.topKHeader}>Top predictions</Text>
                      {topK.slice(0, 5).map((p, j) => (
                        <View key={`${p.label}-${j}`} style={s.topKRow}>
                          <Text style={s.topKLabel} numberOfLines={1}>
                            {(p as { display?: string }).display ?? p.label}
                          </Text>
                          <Text style={s.topKScore}>{(p.score * 100).toFixed(1)}%</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
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

      <Modal
        visible={!!previewUri}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewUri(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle} numberOfLines={1}>
                {previewTitle}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewUri(null)}
                style={s.modalClose}
                hitSlop={8}
                accessibilityRole="button">
                <Feather name="x" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={s.modalImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={renaming}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => (savingTitle ? null : setRenaming(false))}>
        <SafeAreaView style={s.renameSafe}>
          <View style={s.renameHeader}>
            <TouchableOpacity
              onPress={() => setRenaming(false)}
              disabled={savingTitle}
              hitSlop={10}
              style={s.renameHeaderBtn}>
              <Text style={[s.renameCancel, savingTitle && { opacity: 0.4 }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.renameTitle}>Name scan</Text>
            <TouchableOpacity
              onPress={() => void submitRename()}
              disabled={savingTitle || !titleDraft.trim()}
              hitSlop={10}
              style={s.renameHeaderBtn}>
              {savingTitle ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <Text
                  style={[
                    s.renameSave,
                    !titleDraft.trim() && { opacity: 0.4 },
                  ]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.renameBody}>
              <AppInput
                label="Title"
                required
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="Mole near left elbow"
                editable={!savingTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (titleDraft.trim()) void submitRename();
                }}
              />
              <Text style={s.renameHint}>
                Give this scan a short, memorable name so it's easy to find later.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {alertNode}
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
  topTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Space[2],
  },
  topTitle: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.2,
  },
  topTitleIcon: {
    opacity: 0.85,
  },
  renameBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  renameSafe: { flex: 1, backgroundColor: C.bg },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  renameHeaderBtn: { minWidth: 64 },
  renameTitle: {
    fontSize: 17,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.3,
  },
  renameCancel: { fontSize: 16, fontFamily: FontFamily.body, color: C.muted },
  renameSave: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    textAlign: 'right',
  },
  renameBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  renameHint: {
    marginTop: 10,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 20,
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
  wholeCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Space[4],
    marginBottom: Space[4],
    gap: 8,
    ...Shadow.sm,
  },
  wholeOverlayBtn: {
    marginTop: 6,
    padding: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.borderLight,
    gap: 6,
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
  primaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginVertical: 6,
  },
  primaryBannerLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displayBold,
    letterSpacing: 1.1,
  },
  primaryBannerScore: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displayBold,
  },
  regionMeta: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginTop: 6,
  },
  regionImageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  regionImageBlock: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.borderLight,
    backgroundColor: C.surface,
    padding: 8,
    gap: 6,
  },
  regionImageHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regionImageLbl: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.textSub,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  regionImageLarge: {
    width: '100%',
    height: 120,
    borderRadius: Radius.sm,
    backgroundColor: C.surfaceAlt,
  },
  topKBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    gap: 4,
  },
  topKHeader: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  topKRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  topKLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: C.text,
  },
  topKScore: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    marginLeft: 8,
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
