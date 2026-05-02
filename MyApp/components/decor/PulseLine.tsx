import React, { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { C } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * ECG-style pulse line — single brand flourish, renders in two places only
 * (home greeting strip + UV card). On mount fades in once; reduced-motion
 * skips the animation.
 */
export function PulseLine({
  width = 96,
  height = 16,
  color = C.primary,
  strokeWidth = 1.5,
}: Props) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateX = useSharedValue(reduced ? 0 : -8);

  useEffect(() => {
    if (reduced) return;
    opacity.value   = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    translateX.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [opacity, translateX, reduced]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  // Stylized flat-flat-spike-flat-flat ECG path
  const mid = height / 2;
  const w = width;
  const path = `M 0 ${mid} L ${w * 0.18} ${mid} L ${w * 0.28} ${mid - 1} L ${w * 0.36} ${mid + 1} L ${w * 0.44} ${mid - height * 0.5} L ${w * 0.5} ${mid + height * 0.55} L ${w * 0.56} ${mid - 1} L ${w * 0.66} ${mid} L ${w} ${mid}`;

  return (
    <Animated.View style={[{ width, height }, animStyle]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path
          d={path}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
