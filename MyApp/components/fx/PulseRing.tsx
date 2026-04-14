import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  size?: number;
  color?: string;
  trigger?: number;   // increment to fire a pulse
  loop?: boolean;     // continuous soft breathing
}

export function PulseRing({ size = 120, color = 'rgba(155,48,88,0.35)', trigger = 0, loop = false }: Props) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    if (loop) {
      const run = () => {
        scale.value = 0;
        opacity.value = 0.65;
        scale.value = withTiming(1.4, { duration: 1400, easing: Easing.out(Easing.quad) });
        opacity.value = withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) });
      };
      run();
      const id = setInterval(run, 1600);
      return () => clearInterval(id);
    }
    // one-shot
    scale.value = 0;
    opacity.value = 0.7;
    scale.value = withTiming(1.5, { duration: 700, easing: Easing.out(Easing.quad) });
    opacity.value = withSequence(
      withTiming(0.7, { duration: 80 }),
      withTiming(0, { duration: 620, easing: Easing.out(Easing.quad) }),
    );
  }, [trigger, loop, reduce, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
        style,
      ]}
    />
  );
}

const s = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 4,
  },
});
