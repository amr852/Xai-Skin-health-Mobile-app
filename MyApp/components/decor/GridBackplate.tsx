import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { C } from '@/constants/theme';

interface Props {
  /** Width of the area to cover. */
  width: number;
  /** Height of the area to cover. */
  height: number;
  /** Pitch between gridlines in px. Default 24. */
  pitch?: number;
  /** Opacity multiplier applied to the entire grid. Default 0.35. */
  opacity?: number;
  /** Optional style override (e.g. position: 'absolute'). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Faint dotted instrumentation grid — reads as medical equipment, not as
 * decoration. Used in two places only: behind the UV card gauge and behind
 * the vitals ring (already inlined in VitalRingCard for perf).
 */
export function GridBackplate({ width, height, pitch = 24, opacity = 0.35, style }: Props) {
  const cols = Math.max(0, Math.floor(width / pitch) - 1);
  const rows = Math.max(0, Math.floor(height / pitch) - 1);

  return (
    <View
      pointerEvents="none"
      style={[{ width, height, opacity }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no">
      {Array.from({ length: cols }).map((_, i) => (
        <View key={`v-${i}`} style={[s.lineV, { left: pitch * (i + 1) }]} />
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <View key={`h-${i}`} style={[s.lineH, { top: pitch * (i + 1) }]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  lineV: {
    position: 'absolute',
    top: 0, bottom: 0, width: 1,
    backgroundColor: C.border,
    opacity: 0.6,
  },
  lineH: {
    position: 'absolute',
    left: 0, right: 0, height: 1,
    backgroundColor: C.border,
    opacity: 0.6,
  },
});
