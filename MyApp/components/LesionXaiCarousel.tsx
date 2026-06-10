import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageStyle,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type StyleProp,
} from 'react-native';
import type { LesionDetection, WholeImageDiagnosis } from '@/hooks/useLesions';
import { C, FontFamily, Radius, Shadow } from '@/constants/theme';
import { statusFromPrediction } from '@/lib/lesionSeverity';
import { ImageWithBboxOverlay } from '@/components/ImageWithBboxOverlay';

export type LesionCarouselItem = LesionDetection & { displayIndex: number };

export type LesionXaiCarouselHandle = {
  scrollToLesion: (oneBased: number) => void;
};

type Props = {
  lesions: LesionCarouselItem[];
  originalImageUrl?: string | null;
  wholeImage?: WholeImageDiagnosis | null;
  xaiMethod?: string;
  onSlideIndexChange: (zeroBased: number) => void;
  onScrollDragStart?: () => void;
};

type TriageKey = 'Stable' | 'Check' | 'Urgent';

function mapSeverityToTriage(s?: string): TriageKey {
  const k = (s || '').toLowerCase();
  if (k === 'urgent') return 'Urgent';
  if (k === 'stable') return 'Stable';
  return 'Check';
}

const triageColors: Record<TriageKey, { bg: string; color: string; border: string }> = {
  Stable: { bg: C.stableBg,  color: C.stableText,  border: C.stableBorder  },
  Check:  { bg: C.checkBg,   color: C.checkText,   border: C.checkBorder   },
  Urgent: { bg: C.urgentBg,  color: C.urgentText,  border: C.urgentBorder  },
};

function PreprocessedImage({
  uri,
  style,
  accessibilityLabel,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Image
      source={{ uri }}
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      style={style}
    />
  );
}

/** Horizontal score bar for top-k classification rows. */
function ScoreRow({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  const pct = Math.max(0, Math.min(1, score));
  return (
    <View style={sr.row}>
      <View style={sr.labelRow}>
        <Text style={[sr.label, highlight && sr.labelBold]} numberOfLines={1}>{label}</Text>
        <Text style={[sr.pct, highlight && sr.pctBold]}>{(pct * 100).toFixed(1)}%</Text>
      </View>
      <View style={sr.track}>
        <View style={[sr.fill, highlight && sr.fillHighlight, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const sr = StyleSheet.create({
  row:         { marginBottom: 7 },
  labelRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label:       { fontSize: 12, fontFamily: FontFamily.body, color: C.textSub, flex: 1, marginRight: 6 },
  labelBold:   { fontFamily: FontFamily.bodySemibold, color: C.text },
  pct:         { fontSize: 12, fontFamily: FontFamily.body, color: C.textHint },
  pctBold:     { fontFamily: FontFamily.bodyBold, color: C.text },
  track:       { height: 5, backgroundColor: C.surfaceAlt, borderRadius: 99, overflow: 'hidden' },
  fill:        { height: 5, backgroundColor: C.textHint, borderRadius: 99 },
  fillHighlight:{ backgroundColor: C.primary },
});

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.borderLight, marginVertical: 14 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main carousel
// ─────────────────────────────────────────────────────────────────────────────

export const LesionXaiCarousel = forwardRef<LesionXaiCarouselHandle, Props>(function LesionXaiCarousel(
  { lesions, originalImageUrl, wholeImage, xaiMethod, onSlideIndexChange, onScrollDragStart }: Props,
  ref,
) {
  const { width: winW } = useWindowDimensions();
  const listRef = useRef<FlatList<LesionCarouselItem>>(null);
  const horizontalPad = 16;
  const peek = 10;
  const cardW = Math.max(220, winW - horizontalPad * 2 - peek);
  const gap = 10;
  const slideUnit = cardW + gap;

  useImperativeHandle(ref, () => ({
    scrollToLesion(oneBased: number) {
      const idx = Math.max(0, oneBased - 1);
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
      } catch {
        listRef.current?.scrollToOffset({ offset: idx * slideUnit, animated: true });
      }
    },
  }));

  const onScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      listRef.current?.scrollToOffset({ offset: info.index * slideUnit, animated: true });
    },
    [slideUnit],
  );

  const renderItem = useCallback(
    ({ item }: { item: LesionCarouselItem }) => {
      const tri     = mapSeverityToTriage(item.severity);
      const meta    = triageColors[tri];
      const specialist = item.specialist;
      const specialistLabelRaw = specialist?.label ?? item.diagnosis?.label ?? '—';
      const specialistDisplay  = specialist?.display ?? item.diagnosis?.display ?? specialistLabelRaw;
      const score   = typeof specialist?.score === 'number'
        ? specialist.score
        : typeof item.diagnosis?.score === 'number'
          ? item.diagnosis.score
          : 0;
      const cropUri    = item.cropUrl    ?? undefined;
      const overlayUri = item.overlayUrl ?? undefined;
      const topK    = specialist?.top_k ?? item.diagnosis?.top_k ?? [];
      const detConf = ((item.bbox?.conf ?? 0) * 100).toFixed(1);
      const method  = xaiMethod ?? 'Grad-CAM';

      const predStatus = statusFromPrediction(specialistLabelRaw);
      const predMeta   = triageColors[predStatus];

      const primary = item.primary;
      const primaryKey = (primary?.label || '').trim().toLowerCase();
      const isMalignant = primaryKey === 'malignant';
      const primaryMeta = isMalignant ? triageColors.Urgent : triageColors.Stable;
      const primaryDisplay = primary?.display
        ?? (isMalignant ? 'Malignant' : primaryKey ? 'Benign' : null);
      const primaryScorePct = typeof primary?.score === 'number'
        ? `${(primary.score * 100).toFixed(0)}%`
        : null;

      return (
        <View style={[s.slideCell, { width: slideUnit }]}>
          <View style={[s.card, { width: cardW }]}>

            {/* ── Header ─────────────────────────────────────────────── */}
            <View style={s.header}>
              <View>
                <Text style={s.lesionNumLabel}>LESION</Text>
                <Text style={s.lesionNum}>{item.displayIndex}</Text>
              </View>
              <View style={[s.triagePill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <Text style={[s.triageTxt, { color: meta.color }]}>{tri}</Text>
              </View>
            </View>

            {/* ── Primary verdict banner (benign / malignant) ───────── */}
            {primaryDisplay && (
              <View
                style={[
                  s.primaryBanner,
                  { backgroundColor: primaryMeta.bg, borderColor: primaryMeta.border },
                ]}
              >
                <Text style={[s.primaryBannerLabel, { color: primaryMeta.color }]}>
                  {primaryDisplay.toUpperCase()}
                </Text>
                {primaryScorePct ? (
                  <Text style={[s.primaryBannerScore, { color: primaryMeta.color }]}>
                    {primaryScorePct}
                  </Text>
                ) : null}
              </View>
            )}

            {/* ── Specialist subtype diagnosis ───────────────────────── */}
            <View style={[s.diagBlock, { borderColor: predMeta.border, backgroundColor: predMeta.bg }]}>
              <Text style={s.diagClassLabel}>Specialist diagnosis</Text>
              <Text style={[s.diagLabel, { color: predMeta.color }]} numberOfLines={2}>
                {specialistDisplay}
              </Text>
              <View style={s.diagScoreRow}>
                <Text style={[s.diagScore, { color: predMeta.color }]}>{(score * 100).toFixed(1)}%</Text>
                <Text style={s.diagScoreSub}> confidence</Text>
              </View>
            </View>

            {/* ── Top-K breakdown ────────────────────────────────────── */}
            {topK.length > 0 && (
              <>
                <View style={s.sectionRow}>
                  <Text style={s.sectionLabel}>Top predictions</Text>
                </View>
                {topK.map((row, i) => (
                  <ScoreRow
                    key={`${row.label}-${i}`}
                    label={(row as { display?: string }).display ?? row.label}
                    score={row.score}
                    highlight={i === 0}
                  />
                ))}
              </>
            )}

            {/* ── Detection meta ─────────────────────────────────────── */}
            <Text style={s.detMeta}>Detection confidence: {detConf}%</Text>

            <Divider />

            {/* ── Crop + Crop XAI side by side ──────────────────────── */}
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>Detected region · XAI</Text>
              <Text style={s.methodBadge}>{method}</Text>
            </View>
            <View style={s.tileRow}>
              <View style={s.tileWrap}>
                <Text style={s.tileLabel}>Crop</Text>
                {cropUri ? (
                  <PreprocessedImage
                    uri={cropUri}
                    style={s.tileImg}
                    accessibilityLabel="Detected lesion crop"
                  />
                ) : (
                  <View style={[s.tileImg, s.imgPlaceholder]}>
                    <Text style={s.placeholderTxt}>Unavailable</Text>
                  </View>
                )}
              </View>
              <View style={s.tileWrap}>
                <Text style={[s.tileLabel, { color: C.primary }]}>XAI</Text>
                {overlayUri ? (
                  <PreprocessedImage
                    uri={overlayUri}
                    style={s.tileImg}
                    accessibilityLabel="Crop Grad-CAM heatmap"
                  />
                ) : (
                  <View style={[s.tileImg, s.imgPlaceholder]}>
                    <Text style={s.placeholderTxt}>Unavailable</Text>
                  </View>
                )}
              </View>
            </View>

          </View>
        </View>
      );
    },
    [cardW, slideUnit, xaiMethod],
  );

  const keyExtractor = useCallback(
    (item: LesionCarouselItem) => item.lesion_id ?? `lesion-${item.displayIndex}`,
    [],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: slideUnit, offset: slideUnit * index, index }),
    [slideUnit],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / slideUnit);
      onSlideIndexChange(Math.max(0, Math.min(lesions.length - 1, i)));
    },
    [lesions.length, onSlideIndexChange, slideUnit],
  );

  // Build bbox detections for the full-image overlay from all lesion items.
  const fullImageDetections = lesions.map((L) => ({
    bbox: L.bbox,
    severity: L.severity,
    label: L.specialist?.label ?? L.diagnosis?.label,
  }));

  // Whole-image XAI card — shows only the full-photo Grad-CAM heatmap,
  // no diagnosis (diagnosis lives on the per-lesion cards).
  const wholeOverlayUri = wholeImage?.overlayUrl ?? undefined;
  const wholeMethod = xaiMethod ?? 'Grad-CAM';

  if (lesions.length === 0) return null;

  return (
    <View style={s.root}>
      <FlatList
        ref={listRef}
        data={lesions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideUnit}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingLeft: horizontalPad, paddingRight: horizontalPad + peek }}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onScrollBeginDrag={onScrollDragStart}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />

      {/* ── Whole-image XAI box — 3rd card, below the per-lesion carousel ─ */}
      {wholeImage ? (
        <View style={{ width: '100%', paddingHorizontal: horizontalPad, marginTop: 14 }}>
          <View style={[s.card, { width: '100%' }]}>

            <View style={s.header}>
              <View>
                <Text style={s.lesionNumLabel}>WHOLE IMAGE</Text>
                <Text style={s.lesionNum}>XAI</Text>
              </View>
            </View>

            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>Full capture · XAI</Text>
              <Text style={s.methodBadge}>{wholeMethod}</Text>
            </View>
            <View style={s.tileRow}>
              <View style={s.tileWrap}>
                <Text style={s.tileLabel}>Original</Text>
                {originalImageUrl ? (
                  <PreprocessedImage
                    uri={originalImageUrl}
                    style={s.tileImg}
                    accessibilityLabel="Full captured image"
                  />
                ) : (
                  <View style={[s.tileImg, s.imgPlaceholder]}>
                    <Text style={s.placeholderTxt}>Unavailable</Text>
                  </View>
                )}
              </View>
              <View style={s.tileWrap}>
                <Text style={[s.tileLabel, { color: C.primary }]}>XAI</Text>
                {wholeOverlayUri ? (
                  <PreprocessedImage
                    uri={wholeOverlayUri}
                    style={s.tileImg}
                    accessibilityLabel="Whole-image Grad-CAM heatmap"
                  />
                ) : (
                  <View style={[s.tileImg, s.imgPlaceholder]}>
                    <Text style={s.placeholderTxt}>Unavailable</Text>
                  </View>
                )}
              </View>
            </View>

          </View>
        </View>
      ) : null}

      {/* ── Full-image section below the per-lesion carousel ─────────── */}
      {originalImageUrl ? (
        <View style={s.fullSection}>
          <View style={s.fullBlock}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>Full capture · detected regions</Text>
            </View>
            <ImageWithBboxOverlay
              source={{ uri: originalImageUrl }}
              height={220}
              borderRadius={Radius.md}
              detections={fullImageDetections}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    marginBottom: 6,
  },
  slideCell: {
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    paddingHorizontal: 12,
    ...(Platform.OS === 'ios' ? Shadow.sm : { elevation: 2 }),
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lesionNumLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  lesionNum: {
    fontSize: 28,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    lineHeight: 30,
  },
  triagePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  triageTxt: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.3,
  },

  // Primary verdict banner
  primaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  primaryBannerLabel: {
    fontSize: 15,
    fontFamily: FontFamily.displayBold,
    letterSpacing: 1.2,
  },
  primaryBannerScore: {
    fontSize: 15,
    fontFamily: FontFamily.displayBold,
    letterSpacing: 0.3,
  },

  // Diagnosis block
  diagBlock: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  diagClassLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  diagLabel: {
    fontSize: 18,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 22,
  },
  diagScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  diagScore: {
    fontSize: 24,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.5,
  },
  diagScoreSub: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginLeft: 2,
  },

  // Section label row
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  methodBadge: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    letterSpacing: 0.3,
    overflow: 'hidden',
  },

  // Detection meta
  detMeta: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginTop: 8,
  },

  // Side-by-side crop + XAI tiles inside each card
  tileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tileWrap: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  tileImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: C.surfaceAlt,
  },

  imgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTxt: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },

  // Full-image section below carousel
  fullSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  fullBlock: {},
});
