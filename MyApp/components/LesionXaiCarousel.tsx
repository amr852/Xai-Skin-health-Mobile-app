import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
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
  /** Full-frame annotated heatmap when per-lesion overlay is missing. */
  compositeUrl?: string | null;
  xaiMethod?: string;
  /** Fires when the user finishes a swipe or when scroll settles (incl. programmatic). */
  onSlideIndexChange: (zeroBased: number) => void;
  /** User began dragging the carousel — used to distinguish swipe vs programmatic scroll. */
  onScrollDragStart?: () => void;
};

type TriageKey = 'Stable' | 'Check' | 'Urgent';

function mapSeverityToTriage(s?: string): TriageKey {
  const k = (s || '').toLowerCase();
  if (k === 'urgent') return 'Urgent';
  if (k === 'stable') return 'Stable';
  return 'Check';
}

const triageStyle: Record<TriageKey, { bg: string; color: string; border: string }> = {
  Stable: { bg: C.stableBg, color: C.stableText, border: C.stableBorder },
  Check: { bg: C.checkBg, color: C.checkText, border: C.checkBorder },
  Urgent: { bg: C.urgentBg, color: C.urgentText, border: C.urgentBorder },
};

export const LesionXaiCarousel = forwardRef<LesionXaiCarouselHandle, Props>(function LesionXaiCarousel(
  { lesions, compositeUrl, xaiMethod, onSlideIndexChange, onScrollDragStart }: Props,
  ref,
) {
  const { width: winW } = useWindowDimensions();
  const listRef = useRef<FlatList<LesionCarouselItem>>(null);
  const horizontalPad = 16;
  const peek = 22;
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
      const offset = info.index * slideUnit;
      listRef.current?.scrollToOffset({ offset, animated: true });
    },
    [slideUnit],
  );

  const renderItem = useCallback(
    ({ item }: { item: LesionCarouselItem }) => {
      const tri = mapSeverityToTriage(item.severity);
      const meta = triageStyle[tri];
      const label = item.diagnosis?.label ?? '—';
      const score = typeof item.diagnosis?.score === 'number' ? item.diagnosis.score : 0;
      const cropUri = item.cropUrl ?? undefined;
      const overlayUri = item.overlayUrl ?? compositeUrl ?? undefined;
      const topK = item.diagnosis?.top_k;

      return (
        <View style={[styles.slideCell, { width: slideUnit }]}>
          <View style={[styles.card, { width: cardW }]}>
            <View style={styles.cardTop}>
              <Text style={styles.lesionTitle}>Lesion {item.displayIndex}</Text>
              <View style={[styles.triagePill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <Text style={[styles.triageTxt, { color: meta.color }]}>{tri}</Text>
              </View>
            </View>
            <Text style={styles.analysisSectionLabel}>Model analysis</Text>
            <Text style={styles.triageLine}>
              Triage (from prediction):{' '}
              <Text style={styles.triageLineStrong}>{statusFromPrediction(label)}</Text>
            </Text>
            <Text style={styles.pred}>
              {label} · {(score * 100).toFixed(1)}%
            </Text>
            <Text style={styles.meta}>Detector conf: {((item.bbox?.conf ?? 0) * 100).toFixed(1)}%</Text>
            {topK && topK.length > 0 ? (
              <View style={styles.topKBlock}>
                <Text style={styles.blockLabel}>Top classes</Text>
                {topK.map((row, idx) => (
                  <Text key={`${row.label}-${idx}`} style={styles.topKRow}>
                    {row.label}: {(row.score * 100).toFixed(1)}%
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.xaiHint}>
              Explainability: {xaiMethod ?? 'Grad-CAM'} (this crop)
            </Text>
            {cropUri ? (
              <Image source={{ uri: cropUri }} style={styles.cropImg} resizeMode="cover" />
            ) : (
              <View style={[styles.cropImg, styles.placeholder]}>
                <Text style={styles.placeholderTxt}>Crop unavailable</Text>
              </View>
            )}
            <Text style={styles.blockLabel}>Grad-CAM (this region)</Text>
            {overlayUri ? (
              <Image source={{ uri: overlayUri }} style={styles.overlayImg} resizeMode="cover" />
            ) : (
              <View style={[styles.overlayImg, styles.placeholder]}>
                <Text style={styles.placeholderTxt}>Overlay unavailable</Text>
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
    (_: unknown, index: number) => ({
      length: slideUnit,
      offset: slideUnit * index,
      index,
    }),
    [slideUnit],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / slideUnit);
      const clamped = Math.max(0, Math.min(lesions.length - 1, i));
      onSlideIndexChange(clamped);
    },
    [lesions.length, onSlideIndexChange, slideUnit],
  );

  if (lesions.length === 0) return null;

  return (
    <View style={styles.root}>
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
        contentContainerStyle={{
          paddingLeft: horizontalPad,
          paddingRight: horizontalPad + peek,
        }}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onScrollBeginDrag={onScrollDragStart}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />
    </View>
  );
});

const styles = StyleSheet.create({
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
    padding: 16,
    ...(Platform.OS === 'ios' ? Shadow.xs : {}),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lesionTitle: {
    fontSize: 17,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.3,
  },
  triagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  triageTxt: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.3,
  },
  analysisSectionLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  triageLine: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginBottom: 6,
  },
  triageLineStrong: {
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
  },
  pred: {
    fontSize: 16,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginBottom: 8,
  },
  topKBlock: {
    marginBottom: 10,
    gap: 4,
  },
  topKRow: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },
  xaiHint: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: C.primary,
    marginBottom: 8,
  },
  blockLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemibold,
    color: C.textHint,
    marginBottom: 8,
    marginTop: 4,
  },
  cropImg: {
    width: '100%',
    height: 140,
    borderRadius: Radius.lg,
    backgroundColor: C.surfaceAlt,
    marginBottom: 4,
  },
  overlayImg: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: C.surfaceAlt,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTxt: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },
});
