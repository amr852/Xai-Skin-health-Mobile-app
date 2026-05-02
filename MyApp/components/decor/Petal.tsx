import React, { useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  /** Pixel size (square). Default 200. */
  size?: number;
  /** Petal fill — defaults to white-on-rose for use over the gradient hero. */
  color?: string;
  /** Outer ring softness — 0 disables. Default 0.45. */
  opacity?: number;
  /** When true, fades + softly rotates in on mount. Respects reduce-motion. */
  animate?: boolean;
  /** Optional wrapper style. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Soft 8-petal rosette — the single sanctioned botanical accent in the
 * medical-clinical system. Two homes only (DECORATION_BUDGET):
 *   1. Auth welcome hero, behind the Crest.
 *   2. Home greeting strip corner.
 *
 * Petals use radial gradients for soft falloff, no hard edges. Center is
 * deliberately empty so the Crest or other content can sit on top without
 * fighting the rosette.
 */
export function Petal({
  size = 200,
  color = 'rgba(255,255,255,0.42)',
  opacity = 0.55,
  animate = false,
  style,
}: Props) {
  const reduced = useReducedMotion();
  const fade  = useSharedValue(animate && !reduced ? 0 : 1);
  const scale = useSharedValue(animate && !reduced ? 0.9 : 1);
  const spin  = useSharedValue(animate && !reduced ? -8 : 0);

  useEffect(() => {
    if (!animate || reduced) return;
    fade.value  = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    spin.value  = withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [animate, reduced, fade, scale, spin]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }, { rotate: `${spin.value}deg` }],
  }));

  const half = 100;
  const petalCount = 8;
  const petalLen = 70;   // length from center
  const petalW = 26;     // width at base

  return (
    <Animated.View
      style={[{ width: size, height: size, opacity }, animStyle, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="petal" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0"   stopColor={color} stopOpacity={0.9} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1"   stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <G>
          {Array.from({ length: petalCount }).map((_, i) => {
            const a = (i / petalCount) * 360;
            // Each petal is a teardrop centered at top, rotated.
            const d = `
              M ${half} ${half - 4}
              C ${half - petalW / 2} ${half - petalLen * 0.6}
                ${half - petalW / 2} ${half - petalLen}
                ${half} ${half - petalLen}
              C ${half + petalW / 2} ${half - petalLen}
                ${half + petalW / 2} ${half - petalLen * 0.6}
                ${half} ${half - 4}
              Z
            `;
            return (
              <Path
                key={i}
                d={d}
                fill="url(#petal)"
                transform={`rotate(${a} ${half} ${half})`}
              />
            );
          })}
          {/* Soft inner core — barely visible warmth */}
          <Circle cx={half} cy={half} r={6} fill={color} opacity={0.5} />
        </G>
      </Svg>
    </Animated.View>
  );
}
