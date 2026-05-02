import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradient } from '@/constants/theme';

interface Props {
  children?: ReactNode;
  /** Tilt in degrees. Default 16. */
  angle?: number;
  /** Container style. */
  style?: ViewStyle;
}

/**
 * Brand gradient surface — used in two places only: auth hero and the home
 * greeting strip. The 16° tilt is editorial, asymmetric, never centered.
 */
export function GradientHero({ children, angle = 16, style }: Props) {
  // expo-linear-gradient takes start/end normalized {x,y}. Convert from angle.
  const rad = (angle * Math.PI) / 180;
  const start = { x: 0, y: 0 };
  const end   = { x: Math.cos(rad), y: Math.sin(rad) };

  return (
    <View style={[s.wrap, style]}>
      <LinearGradient
        colors={[Gradient.hero[0], Gradient.hero[1]]}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
