import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  fire: number;        // increment to fire once
  count?: number;
  duration?: number;
  emojis?: string[];
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  emoji: string;
  rot: number;
  delay: number;
  drift: number;
  scale: number;
}

function makeParticles(count: number, emojis: string[]): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: i,
      x: Math.random() * SCREEN_W,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      rot: (Math.random() - 0.5) * 720,
      delay: Math.random() * 240,
      drift: (Math.random() - 0.5) * 120,
      scale: 0.7 + Math.random() * 0.7,
    });
  }
  return list;
}

function Piece({ p, duration }: { p: Particle; duration: number }) {
  const y = useSharedValue(-40);
  const r = useSharedValue(0);
  const o = useSharedValue(0);

  useEffect(() => {
    y.value = -40;
    o.value = 1;
    r.value = 0;
    y.value = withDelay(
      p.delay,
      withTiming(SCREEN_H + 80, { duration, easing: Easing.in(Easing.quad) }),
    );
    r.value = withDelay(
      p.delay,
      withTiming(p.rot, { duration, easing: Easing.linear }),
    );
    o.value = withDelay(
      p.delay + duration - 400,
      withTiming(0, { duration: 400 }),
    );
  }, [p, duration, y, r, o]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: p.drift * (y.value / SCREEN_H) },
      { rotate: `${r.value}deg` },
      { scale: p.scale },
    ],
    opacity: o.value,
  }));

  return (
    <Animated.View style={[s.piece, { left: p.x }, style]}>
      <Text style={s.emoji}>{p.emoji}</Text>
    </Animated.View>
  );
}

export function Confetti({
  fire,
  count = 26,
  duration = 2200,
  emojis = ['🎉', '✨', '💖', '🌸', '⭐'],
}: Props) {
  const reduce = useReduceMotion();
  const key = fire;
  const particles = useMemo(() => makeParticles(count, emojis), [key, count, emojis]);

  if (reduce || fire === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map(p => (
        <Piece key={`${key}-${p.id}`} p={p} duration={duration} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
  emoji: { fontSize: 22 },
});
