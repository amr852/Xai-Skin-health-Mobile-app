import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import {
  bboxToOverlayRect,
  containLayout,
  type LesionBbox,
} from '@/lib/bboxLayout';

export type DetectionOverlayItem = {
  bbox: LesionBbox;
  severity?: string;
  label?: string;
};

type Props = {
  source: ImageSourcePropType;
  detections: DetectionOverlayItem[];
  height: number;
  /** Default full width; set a number for square thumbnails (e.g. 72). */
  width?: number | `${number}%` | '100%';
  borderRadius?: number;
};

function borderColorForSeverity(severity?: string): string {
  switch ((severity || '').toLowerCase()) {
    case 'urgent':
      return '#ef4444';
    case 'check':
      return '#f59e0b';
    case 'stable':
      return '#22c55e';
    default:
      return 'rgba(255,255,255,0.95)';
  }
}

export function ImageWithBboxOverlay({
  source,
  detections,
  height,
  width = '100%',
  borderRadius = 22,
}: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [layout, setLayout] = useState({ w: 0, h: 0 });

  const uri =
    typeof source === 'object' && source !== null && 'uri' in source
      ? (source as { uri: string }).uri
      : null;

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

  return (
    <View
      style={[styles.wrap, { height, width, borderRadius }]}
      onLayout={e => {
        const { width, height: h } = e.nativeEvent.layout;
        setLayout({ w: width, h });
      }}>
      <Image
        source={source}
        style={[styles.image, { height, width, borderRadius }]}
        resizeMode="contain"
      />
      {contain && detections.length > 0
        ? detections.map((d, i) => {
            const r = bboxToOverlayRect(d.bbox, contain);
            const color = borderColorForSeverity(d.severity);
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
                  },
                ]}
              />
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
    backgroundColor: '#111',
  },
  image: {
    width: '100%',
    backgroundColor: '#111',
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
});
