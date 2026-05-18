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
import type { LesionDetection } from '@/hooks/useLesions';
import { C, FontFamily, Radius, Shadow } from '@/constants/theme';
import { statusFromPrediction } from '@/lib/lesionSeverity';

export type LesionCarouselItem = LesionDetection & { displayIndex: number };

export type LesionXaiCarouselHandle = {
  scrollToLesion: (oneBased: number) => void;
};

type Props = {
  lesions: LesionCarouselItem[];
  compositeUrl?: string | null;
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

/**
 * Renders crop / heatmap as a uniform 1:1 square. The model server now
 * preprocesses every crop (and its Grad-CAM overlay) to `IMG_SIZE × IMG_SIZE`
 * before the response is sent, so what we display here is exactly what the
 * classifier sees. `cover` ensures any legacy assets whose bytes still carry
 * a baked-in label strip get cropped flush to the square — no letterbox, no
 * dangling caption.
 */
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

/** A thin horizontal rule used to separate card sections. */
function Divider() {
  return <View style={{ height: 1, backgroundColor: C.borderLight, marginVertical: 14 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main carousel
// ─────────────────────────────────────────────────────────────────────────────

export const LesionXaiCarousel = forwardRef<LesionXaiCarouselHandle, Props>(function LesionXaiCarousel(
  { lesions, compositeUrl, xaiMethod, onSlideIndexChange, onScrollDragStart }: Props,
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
      const overlayUri = item.overlayUrl ?? compositeUrl ?? undefined;
      const topK    = specialist?.top_k ?? item.diagnosis?.top_k ?? [];
      const detConf = ((item.bbox?.conf ?? 0) * 100).toFixed(1);
      const method  = xaiMethod ?? 'Grad-CAM';

      // Specialist label drives the severity-tier colour for the subtype chip.
      const predStatus = statusFromPrediction(specialistLabelRaw);
      const predMeta   = triageColors[predStatus];

      // Primary head verdict (benign|malignant) drives the top banner colour.
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

            {/* ── Captured region image ──────────────────────────────── */}
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>Captured region</Text>
              <Text style={s.methodBadge}>{method}</Text>
            </View>
            {cropUri ? (
              <PreprocessedImage
                uri={cropUri}
                style={s.squareImg}
                accessibilityLabel="Detected lesion crop"
              />
            ) : (
              <View style={[s.squareImg, s.imgPlaceholder]}>
                <Text style={s.placeholderTxt}>Region crop unavailable</Text>
              </View>
            )}

            <Divider />

            {/* ── Grad-CAM heatmap ───────────────────────────────────── */}
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>Explainability heatmap</Text>
            </View>
            {overlayUri ? (
              <PreprocessedImage
                uri={overlayUri}
                style={s.squareImg}
                accessibilityLabel="Grad-CAM explainability heatmap"
              />
            ) : (
              <View style={[s.squareImg, s.imgPlaceholder]}>
                <Text style={s.placeholderTxt}>Heatmap unavailable</Text>
              </View>
            )}

          </View>
        </View>
      );
    },
    [cardW, compositeUrl, slideUnit, xaiMethod],
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

  // Primary verdict banner (benign / malignant)
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

  // Images — square 1:1 so captured region and heatmap line up at identical
  // dimensions. The model returns both at IMG_SIZE × IMG_SIZE, so cover
  // resizing here is a no-op for new data and a clean crop for legacy data.
  squareImg: {
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
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },
});
