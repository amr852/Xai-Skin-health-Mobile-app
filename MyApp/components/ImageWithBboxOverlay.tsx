import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import {
  bboxToOverlayRect,
  containLayout,
  resolveImagePreviewFrame,
  type LesionBbox,
} from '@/lib/bboxLayout';
import { C, FontFamily, Overlay, Radius } from '@/constants/theme';

export type DetectionOverlayItem = {
  bbox: LesionBbox;
  severity?: string;
  label?: string;
  /** 1-based lesion index shown on the badge; omit to hide the badge. */
  lesionNumber?: number;
};

type Props = {
  source: ImageSourcePropType;
  detections: DetectionOverlayItem[];
  height: number;
  /** Default full width; set a number for square thumbnails (e.g. 72). */
  width?: number | `${number}%` | '100%';
  borderRadius?: number;
  /** When set to a number, only that lesion (1-based) is full-opacity; others dim. `'all'` shows every box equally. */
  highlightSelection?: 'all' | number;
};

function borderColorForSeverity(severity?: string): string {
  switch ((severity || '').toLowerCase()) {
    case 'urgent':
      return C.urgentBorder;
    case 'check':
      return C.checkBorder;
    case 'stable':
      return C.stableBorder;
    default:
      return C.borderFocus;
  }
}

export function ImageWithBboxOverlay({
  source,
  detections,
  height,
  width = '100%',
  borderRadius = 22,
  highlightSelection = 'all',
}: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [loadingImage, setLoadingImage] = useState(true);

  const uri =
    typeof source === 'object' && source !== null && 'uri' in source
      ? (source as { uri: string }).uri
      : null;

  useEffect(() => {
    setLoadingImage(true);
    setNatural(null);
  }, [uri]);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setNatural({ w, h });
      },
      () => {
        if (!cancelled) setNatural(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const overlayReady = natural && layout.w > 0 && layout.h > 0;
  const contain = overlayReady
    ? containLayout(layout.w, layout.h, natural!.w, natural!.h)
    : null;
  const frame = resolveImagePreviewFrame({
    width,
    fallbackHeight: height,
    imageW: natural?.w,
    imageH: natural?.h,
  });

  return (
    <View
      style={[styles.wrap, { width, borderRadius }, frame]}
      onLayout={e => {
        const { width: lw, height: lh } = e.nativeEvent.layout;
        setLayout({ w: lw, h: lh });
      }}>
      <Image
        source={source}
        style={[styles.image, { width, borderRadius }, frame]}
        resizeMode="contain"
        onLoadStart={() => setLoadingImage(true)}
        onLoadEnd={() => setLoadingImage(false)}
        onError={() => setLoadingImage(false)}
      />
      {loadingImage ? (
        <View pointerEvents="none" style={styles.loadingMask}>
          <ActivityIndicator size="small" color={C.primary} />
        </View>
      ) : null}
      {contain && detections.length > 0
        ? detections.map((d, i) => {
            const r = bboxToOverlayRect(d.bbox, contain);
            const color = borderColorForSeverity(d.severity);
            const num = d.lesionNumber;
            const dimmed =
              highlightSelection !== 'all' &&
              typeof num === 'number' &&
              num !== highlightSelection;
            return (
              <View
                key={`${d.bbox.x1}-${d.bbox.y1}-${i}`}
                pointerEvents="none"
                style={[
                  styles.box,
                  {
                    left: r.left,
                    top: r.top,
                    width: Math.max(1, r.width),
                    height: Math.max(1, r.height),
                    borderColor: color,
                    opacity: dimmed ? 0.38 : 1,
                  },
                ]}>
                {dimmed ? <View style={[styles.dimScrim, { backgroundColor: Overlay.scrimSoft }]} /> : null}
                {typeof num === 'number' ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{num}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: C.surfaceAlt,
  },
  image: {
    width: '100%',
    backgroundColor: C.surfaceAlt,
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: Radius.xs,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  dimScrim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.xs,
  },
  loadingMask: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Overlay.scrimSoft,
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.white,
    letterSpacing: 0.2,
  },
});
