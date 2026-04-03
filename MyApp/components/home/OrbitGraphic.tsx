import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { C } from '@/constants/theme';

export function OrbitGraphic({
  size = 76,
  variant = 'default',
}: {
  size?: number;
  variant?: 'default' | 'vitalPurple';
}) {
  const ring = variant === 'vitalPurple' ? C.diagPurpleRing : '#E8E4F2';
  const bigDot = variant === 'vitalPurple' ? C.purpleLight : C.blueLight;
  const smDot = variant === 'vitalPurple' ? C.purpleFill : C.amberFill;
  return (
    <Svg width={size} height={size} viewBox="0 0 76 76">
      <Circle cx={38} cy={38} r={32} fill="none" stroke={ring} strokeWidth={1.5} />
      <Circle cx={38} cy={38} r={22} fill="none" stroke={ring} strokeWidth={1.5} />
      <Circle cx={38} cy={38} r={12} fill="none" stroke={ring} strokeWidth={1.5} />
      <Circle cx={30} cy={44} r={9} fill={bigDot} opacity={0.95} />
      <Circle cx={44} cy={50} r={5} fill={smDot} />
    </Svg>
  );
}
