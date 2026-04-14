import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C, FontSize, Radius, Space } from '@/constants/theme';
import { BodySilhouette } from './BodySilhouette';
import { LesionDot } from './LesionDot';
import type { BodyPoint } from '@/lib/bodyPointStorage';

interface PlottedLesion {
  _id: string;
  title: string;
  status: 'Stable' | 'Check' | 'Urgent';
  bodyPoint: BodyPoint;
}

interface Props {
  lesions: PlottedLesion[];
  onDotPress?: (lesionId: string) => void;
  onEmptyPress?: (point: BodyPoint) => void;
  interactive?: boolean;
}

export function BodyMap({ lesions, onDotPress, onEmptyPress, interactive = true }: Props) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const onMapPress = (evt: any) => {
    if (!interactive || !onEmptyPress || size.w === 0) return;
    const { locationX, locationY } = evt.nativeEvent;
    onEmptyPress({
      x: Math.max(0, Math.min(1, locationX / size.w)),
      y: Math.max(0, Math.min(1, locationY / size.h)),
      side,
    });
  };

  const visible = lesions.filter(l => l.bodyPoint.side === side);

  return (
    <View style={s.wrap}>
      {/* Side toggle */}
      <View style={s.toggle}>
        {(['front', 'back'] as const).map(k => {
          const active = side === k;
          return (
            <Pressable
              key={k}
              onPress={() => setSide(k)}
              style={[s.toggleBtn, active && s.toggleBtnActive]}>
              <Feather
                name={k === 'front' ? 'user' : 'user-check'}
                size={13}
                color={active ? '#fff' : C.textHint}
              />
              <Text style={[s.toggleTxt, active && s.toggleTxtActive]}>
                {k === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Silhouette + dots */}
      <Pressable style={s.canvasWrap} onPress={onMapPress}>
        <View style={s.canvas} onLayout={onLayout}>
          <BodySilhouette side={side} width={200} height={440} />
          {size.w > 0 && visible.map((l, i) => (
            <LesionDot
              key={l._id}
              x={l.bodyPoint.x}
              y={l.bodyPoint.y}
              status={l.status}
              index={i}
              onPress={() => onDotPress?.(l._id)}
            />
          ))}
        </View>
      </Pressable>

      {/* Legend */}
      <View style={s.legend}>
        {([
          { key: 'Stable', color: C.stableText },
          { key: 'Check',  color: C.checkText  },
          { key: 'Urgent', color: C.urgentText },
        ] as const).map(item => (
          <View key={item.key} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: item.color }]} />
            <Text style={s.legendTxt}>{item.key}</Text>
          </View>
        ))}
      </View>

      {interactive && onEmptyPress && (
        <Text style={s.hint}>Tap anywhere on the silhouette to mark a new spot.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Space[3],
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: C.surfaceAlt,
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: Space[3],
  },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.full,
  },
  toggleBtnActive: { backgroundColor: C.primary },
  toggleTxt: { fontSize: FontSize.xs + 1, color: C.textHint, fontWeight: '700' },
  toggleTxtActive: { color: '#fff' },

  canvasWrap: { alignItems: 'center', justifyContent: 'center' },
  canvas: {
    width: 200, height: 440,
    position: 'relative',
  },

  legend: {
    flexDirection: 'row',
    gap: Space[4],
    marginTop: Space[3],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: '#fff',
  },
  legendTxt: { fontSize: FontSize.xs, color: C.textSub, fontWeight: '600' },

  hint: {
    fontSize: FontSize.xs,
    color: C.muted,
    marginTop: Space[2],
    textAlign: 'center',
    paddingHorizontal: Space[5],
  },
});
