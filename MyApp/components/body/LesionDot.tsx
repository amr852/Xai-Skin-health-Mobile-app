import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { C } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  x: number;          // 0..1 of container width
  y: number;          // 0..1 of container height
  status: 'Stable' | 'Check' | 'Urgent';
  index?: number;     // for staggered entry
  onPress?: () => void;
}

const STATUS_COLOR: Record<Props['status'], string> = {
  Stable: C.stableText,
  Check:  C.checkText,
  Urgent: C.urgentText,
};

export function LesionDot({ x, y, status, index = 0, onPress }: Props) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      scale.value = 1;
      return;
    }
    scale.value = withDelay(index * 60, withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.6)) }));
    if (status === 'Urgent') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    }
  }, [reduce, status, index, scale, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value }],
    opacity: 1 - pulse.value,
  }));

  const color = STATUS_COLOR[status];

  return (
    <View style={[s.wrap, { left: `${x * 100}%`, top: `${y * 100}%` }]} pointerEvents="box-none">
      <Pressable onPress={onPress} hitSlop={10}>
        <View style={s.anchor}>
          {status === 'Urgent' && (
            <Animated.View style={[s.ring, { borderColor: color }, ringStyle]} />
          )}
          <Animated.View style={[s.dot, { backgroundColor: color }, dotStyle]} />
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', marginLeft: -7, marginTop: -7 },
  anchor: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#fff',
  },
  ring: {
    position: 'absolute',
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
  },
});
