import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C } from '@/constants/theme';

interface Props {
  /** Length in px. Defaults to '100%'. */
  width?: number | '100%';
  /** Vertical thickness. Default 1. */
  height?: number;
  /** Color override (default border slate-200). */
  color?: string;
  /** Inset percentage on each end where opacity is 0 (creates the fade). 0–0.5. */
  fadeInset?: number;
  style?: ViewStyle;
}

/**
 * Tonal gradient hairline — replaces the LeafTrail dividers entirely. Two
 * sanctioned placements: profile section breaks, history filter bar.
 */
export function Hairline({
  width = '100%',
  height = 1,
  color = C.border,
  fadeInset = 0.08,
  style,
}: Props) {
  // SVG with linear gradient — fades from transparent → color → transparent.
  const inset = Math.max(0, Math.min(0.49, fadeInset));
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={'100%'} height={height}>
        <Defs>
          <LinearGradient id="hairline" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"           stopColor={color} stopOpacity={0} />
            <Stop offset={String(inset)}     stopColor={color} stopOpacity={0.7} />
            <Stop offset={String(1 - inset)} stopColor={color} stopOpacity={0.7} />
            <Stop offset="1"           stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={height} fill="url(#hairline)" />
      </Svg>
    </View>
  );
}
