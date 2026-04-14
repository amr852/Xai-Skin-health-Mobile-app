import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate,
} from 'react-native-reanimated';
import { C, Radius } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 14, radius = 6, style }: Props) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [reduce, progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.35, 0.9, 0.35]),
  }));

  return (
    <View
      style={[
        s.base,
        { width: width as any, height, borderRadius: radius, backgroundColor: C.surfaceAlt },
        style,
      ]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: C.border, borderRadius: radius },
          shimmerStyle,
        ]}
      />
    </View>
  );
}

interface RowProps {
  style?: ViewStyle;
}

export function SkeletonLesionRow({ style }: RowProps) {
  return (
    <View style={[s.row, style]}>
      <Skeleton height={170} radius={0} width="100%" style={{ borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl }} />
      <View style={{ padding: 14 }}>
        <Skeleton height={16} width="60%" style={{ marginBottom: 8 }} />
        <Skeleton height={12} width="90%" style={{ marginBottom: 6 }} />
        <Skeleton height={12} width="40%" />
      </View>
    </View>
  );
}

export function SkeletonNotifRow({ style }: RowProps) {
  return (
    <View style={[s.notifRow, style]}>
      <Skeleton width={44} height={44} radius={14} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="35%" height={10} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="60%" height={12} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  base: { overflow: 'hidden' },
  row: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
});
