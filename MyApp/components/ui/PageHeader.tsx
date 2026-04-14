import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, Easing, withRepeat,
} from 'react-native-reanimated';
import { C } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  initials: string;
  name: string;
  unreadCount?: number;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function PageHeader({ initials, name, unreadCount = 0, onBellPress, onAvatarPress }: Props) {
  const reduce = useReduceMotion();
  const bellRot = useSharedValue(0);
  const dotPulse = useSharedValue(1);
  const lastCountRef = useRef(unreadCount);

  useEffect(() => {
    if (reduce) return;
    // Swing once when new unread arrives
    if (unreadCount > lastCountRef.current) {
      bellRot.value = withSequence(
        withTiming(-8, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(8, { duration: 120 }),
        withTiming(-5, { duration: 90 }),
        withTiming(0, { duration: 120 }),
      );
    }
    lastCountRef.current = unreadCount;
  }, [unreadCount, reduce, bellRot]);

  useEffect(() => {
    if (reduce || unreadCount === 0) {
      dotPulse.value = 1;
      return;
    }
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [unreadCount, reduce, dotPulse]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRot.value}deg` }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotPulse.value }],
  }));

  return (
    <View style={s.row}>
      <View style={s.left}>
        <TouchableOpacity
          style={s.avatarRing}
          onPress={onAvatarPress}
          activeOpacity={onAvatarPress ? 0.7 : 1}
          disabled={!onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Go to profile">
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          {onAvatarPress && <View style={s.avatarEditDot}><Feather name="user" size={8} color="#fff" /></View>}
        </TouchableOpacity>
        <View>
          <Text style={s.greeting}>{getGreeting()},</Text>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={s.bell}
        onPress={onBellPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Notifications">
        <Animated.View style={bellStyle}>
          <Feather name="bell" size={18} color={C.primary} />
        </Animated.View>
        {unreadCount > 0 && (
          <Animated.View style={[s.dot, dotStyle]}>
            <Text style={s.dotNum}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  avatarEditDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.primary,
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  greeting: { fontSize: 11, color: C.textHint, fontWeight: '500', letterSpacing: 0.2 },
  name: { fontSize: 16, fontWeight: '700', color: C.text, maxWidth: 180 },

  bell: {
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: C.primaryLight,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#DC2626',
    position: 'absolute', top: 7, right: 7,
    borderWidth: 1.5, borderColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotNum: { fontSize: 8, fontWeight: '800', color: '#fff' },
});
