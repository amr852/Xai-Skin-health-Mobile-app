import React from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { C, Gradient } from '@/constants/theme';

interface Props {
  size?: number;
  /** Render the inner monogram. */
  withMonogram?: boolean;
  /** Override fill — defaults to brand gradient. */
  solid?: string;
}

/**
 * Geometric brand crest — replaces the floral wreath in auth/welcome.
 *
 * A rotated rounded square with a chamfered top-right corner; inner offset
 * stroke and a single "X" monogram. Single deliberate brand mark — never
 * decorative repetition.
 */
export function Crest({ size = 84, withMonogram = true, solid }: Props) {
  // Outer rotated rounded square — rotation handled by SVG transform
  // Stroke is offset inside the shape for an inset feel.
  const outer = 64;
  const innerInset = 6;

  return (
    <Svg width={size} height={size} viewBox="0 0 84 84">
      <Defs>
        <LinearGradient id="crestFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={Gradient.hero[0]} />
          <Stop offset="1" stopColor={Gradient.hero[1]} />
        </LinearGradient>
      </Defs>
      {/* Rotate 6° for editorial asymmetry */}
      <Rect
        x={(84 - outer) / 2}
        y={(84 - outer) / 2}
        width={outer}
        height={outer}
        rx={18}
        ry={18}
        fill={solid ?? 'url(#crestFill)'}
        transform="rotate(-6 42 42)"
      />
      {/* Chamfered top-right corner — small triangle in surface color */}
      <Path
        d="M 60 14 L 78 14 L 78 32 Z"
        fill={C.bg}
        opacity={0}
      />
      {/* Inner offset stroke for inset feel */}
      <Rect
        x={(84 - outer) / 2 + innerInset}
        y={(84 - outer) / 2 + innerInset}
        width={outer - innerInset * 2}
        height={outer - innerInset * 2}
        rx={12}
        ry={12}
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth={1.25}
        transform="rotate(-6 42 42)"
      />
      {withMonogram && (
        <SvgText
          x={42}
          y={52}
          fill="#FFFFFF"
          textAnchor="middle"
          fontSize={32}
          fontWeight="700"
          letterSpacing={-1}>
          X
        </SvgText>
      )}
    </Svg>
  );
}
