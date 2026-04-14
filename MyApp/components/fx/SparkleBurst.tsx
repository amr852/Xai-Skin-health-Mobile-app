import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  fire: number;
  size?: number;
  color?: string;
  count?: number;
}

function Star({ angle, distance, delay, color }: { angle: number; distance: number; delay: number; color: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => {
    const x = Math.cos(angle) * distance * t.value;
    const y = Math.sin(angle) * distance * t.value;
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: 1 - t.value * 0.5 }],
      opacity: 1 - t.value,
    };
  });

  return (
    <Animated.View style={[s.star, style]}>
      <Text style={[s.dot, { color }]}>✦</Text>
    </Animated.View>
  );
}

export function SparkleBurst({ fire, size = 120, color = '#F59E0B', count = 8 }: Props) {
  const reduce = useReduceMotion();
  const stars = useMemo(() => {
    const list: { angle: number; distance: number; delay: number }[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        angle: (Math.PI * 2 * i) / count,
        distance: size / 2 + 10,
        delay: Math.random() * 80,
      });
    }
    return list;
  }, [fire, count, size]);

  if (reduce || fire === 0) return null;

  return (
    <View pointerEvents="none" style={[s.wrap, { width: size, height: size }]}>
      {stars.map((st, i) => (
        <Star key={`${fire}-${i}`} {...st} color={color} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { position: 'absolute' },
  dot: { fontSize: 18, fontWeight: '900' },
});
