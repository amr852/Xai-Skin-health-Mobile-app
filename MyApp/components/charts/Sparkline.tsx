import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { C } from '@/constants/theme';

interface Props {
  /** Data points (e.g. last 7 days of hydration). At least 2 values. */
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Show a dot on the latest point. Default true. */
  showLatest?: boolean;
  /** Optional y-axis max — default = max(data). */
  max?: number;
}

/**
 * Tiny inline sparkline. Used by vitals as 7-day context — a chart, not a
 * decoration. Renders a smooth path with a final-point dot.
 */
export function Sparkline({
  data,
  width = 72,
  height = 22,
  color = C.primary,
  showLatest = true,
  max,
}: Props) {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const yMax = Math.max(max ?? 0, ...data, 1);
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * stepX,
    y: height - (v / yMax) * height,
  }));

  // Smooth Catmull–Rom-ish path
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cx = (p0.x + p1.x) / 2;
    d += ` Q ${cx} ${p0.y} ${cx} ${(p0.y + p1.y) / 2} T ${p1.x} ${p1.y}`;
  }

  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {showLatest && (
        <>
          <Circle cx={last.x} cy={last.y} r={3} fill={color} opacity={0.18} />
          <Circle cx={last.x} cy={last.y} r={1.6} fill={color} />
        </>
      )}
    </Svg>
  );
}
