import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';
import { C } from '@/constants/theme';

/**
 * Decorative concentric-blossom graphic — used as a soft accent on vital cards.
 * API kept identical to the previous orbit graphic so existing callers don't break.
 */
export function OrbitGraphic({
  size = 76,
  variant = 'default',
}: {
  size?: number;
  variant?: 'default' | 'vitalPurple';
}) {
  const ring = variant === 'vitalPurple' ? C.diagPurpleRing : C.borderLight;
  const petal = variant === 'vitalPurple' ? C.purpleFill : C.primarySoft;
  const center = variant === 'vitalPurple' ? C.purple : C.gold;

  // Inner ring of 6 petals
  const inner = Array.from({ length: 6 }).map((_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const cx = 38 + Math.cos(a) * 12;
    const cy = 38 + Math.sin(a) * 12;
    return <Circle key={`i${i}`} cx={cx} cy={cy} r={4.5} fill={petal} opacity={0.95} />;
  });
  // Outer ring of 8 petals (smaller)
  const outer = Array.from({ length: 8 }).map((_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const cx = 38 + Math.cos(a) * 26;
    const cy = 38 + Math.sin(a) * 26;
    return <Circle key={`o${i}`} cx={cx} cy={cy} r={2.4} fill={petal} opacity={0.6} />;
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 76 76">
      <Circle cx={38} cy={38} r={32} fill="none" stroke={ring} strokeWidth={0.8} opacity={0.45} />
      <Circle cx={38} cy={38} r={22} fill="none" stroke={ring} strokeWidth={0.8} opacity={0.45} />
      <G>{outer}</G>
      <G>{inner}</G>
      <Circle cx={38} cy={38} r={5} fill={center} />
      <Circle cx={38} cy={38} r={2.2} fill="#FFF8EC" opacity={0.65} />
    </Svg>
  );
}
