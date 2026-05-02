import { useCallback } from 'react';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Floral } from '@/constants/theme';
import { useReducedMotion } from './useReducedMotion';

/**
 * Floral press feedback — a subtle scale spring on press for floral icons & CTAs.
 * Respects reduced-motion: returns identity styles and no-op handlers when disabled.
 */
export function useFloralBloom() {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (reduced) return;
    scale.value = withTiming(Floral.press.scale, { duration: 90, easing: Easing.out(Easing.quad) });
  }, [reduced, scale]);

  const onPressOut = useCallback(() => {
    if (reduced) return;
    scale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.5 });
  }, [reduced, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle, reduced };
}
