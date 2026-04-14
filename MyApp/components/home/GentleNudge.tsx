import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { C, FontSize, Radius, Space } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface Props {
  visible: boolean;
  icon?: FeatherIconName;
  message: string;
  tone?: 'info' | 'warn';
  actionLabel?: string;
  onAction?: () => void;
}

export function GentleNudge({ visible, icon = 'info', message, tone = 'info', actionLabel, onAction }: Props) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      progress.value = visible ? 1 : 0;
      return;
    }
    progress.value = withTiming(visible ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [visible, reduce, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -6 }],
    height: progress.value === 0 ? 0 : undefined,
  }));

  if (!visible && progress.value === 0) return null;

  const accent = tone === 'warn' ? C.amberFill : C.primary;
  const bg     = tone === 'warn' ? C.amberLight : C.primaryLight;

  return (
    <Animated.View style={[s.wrap, { backgroundColor: bg, borderColor: accent + '33' }, animStyle]}>
      <View style={[s.iconBg, { backgroundColor: accent + '22' }]}>
        <Feather name={icon} size={13} color={accent} />
      </View>
      <Text style={[s.msg, { color: C.text }]} numberOfLines={2}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={[s.btn, { borderColor: accent }]}>
          <Text style={[s.btnTxt, { color: accent }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    marginHorizontal: Space[5],
    marginBottom: Space[3],
    paddingHorizontal: Space[3],
    paddingVertical: Space[2] + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconBg: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  msg: { flex: 1, fontSize: FontSize.xs + 1, fontWeight: '600' },
  btn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  btnTxt: { fontSize: 11, fontWeight: '700' },
});
