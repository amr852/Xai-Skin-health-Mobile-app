import React from 'react';
import Svg, { Path, Ellipse, Rect } from 'react-native-svg';
import { C } from '@/constants/theme';

export const BODY_VIEWBOX = { w: 200, h: 440 };

interface Props {
  side: 'front' | 'back';
  stroke?: string;
  fill?: string;
  width?: number;
  height?: number;
}

// Simplified unisex silhouette. Proportions are intentionally stylized — this
// is a reference map, not an anatomical render.
export function BodySilhouette({ side, stroke = C.border, fill = C.primaryLight, width, height }: Props) {
  const w = width ?? BODY_VIEWBOX.w;
  const h = height ?? BODY_VIEWBOX.h;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${BODY_VIEWBOX.w} ${BODY_VIEWBOX.h}`}>
      {/* Head */}
      <Ellipse cx={100} cy={38} rx={24} ry={28} fill={fill} stroke={stroke} strokeWidth={1.5} />

      {/* Neck */}
      <Rect x={92} y={62} width={16} height={12} rx={3} fill={fill} stroke={stroke} strokeWidth={1.5} />

      {/* Torso */}
      <Path
        d="M60 78 Q100 70 140 78 L150 160 Q150 200 140 240 L130 280 Q100 290 70 280 L60 240 Q50 200 50 160 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />

      {/* Left arm */}
      <Path
        d="M60 82 Q40 100 34 140 Q28 180 30 220 Q30 235 38 236 Q46 232 48 215 Q54 180 58 145 Q62 115 66 92 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      {/* Right arm */}
      <Path
        d="M140 82 Q160 100 166 140 Q172 180 170 220 Q170 235 162 236 Q154 232 152 215 Q146 180 142 145 Q138 115 134 92 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />

      {/* Hips */}
      <Path
        d="M65 275 Q100 295 135 275 L142 320 Q120 330 100 330 Q80 330 58 320 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />

      {/* Left leg */}
      <Path
        d="M70 325 Q74 360 76 400 Q78 425 86 425 Q94 424 94 400 Q96 360 94 325 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      {/* Right leg */}
      <Path
        d="M130 325 Q126 360 124 400 Q122 425 114 425 Q106 424 106 400 Q104 360 106 325 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />

      {/* Face / back hint */}
      {side === 'front' ? (
        <>
          {/* eyes */}
          <Ellipse cx={92} cy={36} rx={1.5} ry={2} fill={stroke} />
          <Ellipse cx={108} cy={36} rx={1.5} ry={2} fill={stroke} />
          {/* mouth */}
          <Path d="M94 48 Q100 52 106 48" stroke={stroke} strokeWidth={1.2} fill="none" />
        </>
      ) : (
        // spine hint
        <Path d="M100 80 L100 275" stroke={stroke} strokeWidth={1} strokeDasharray="3 4" fill="none" />
      )}
    </Svg>
  );
}
