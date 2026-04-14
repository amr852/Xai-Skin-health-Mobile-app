import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { C, FontSize, Radius, Shadow, Space } from '@/constants/theme';
import { useLesions } from '@/hooks/useLesions';
import { useStreakMilestone } from '@/hooks/useStreakMilestone';
import { Confetti } from '@/components/fx/Confetti';
import { useReduceMotion } from '@/hooks/useReduceMotion';

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((bUTC - aUTC) / msPerDay);
}

function uniqueScanDays(lesions: { createdAt: string }[]): number {
  const set = new Set<string>();
  for (const l of lesions) {
    const d = new Date(l.createdAt);
    set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return set.size;
}

export function SelfExamCard() {
  const router = useRouter();
  const { lesions, fetchLesions } = useLesions();
  const reduce = useReduceMotion();

  useEffect(() => { void fetchLesions(); }, [fetchLesions]);

  const { daysSince, totalScans, streak } = useMemo(() => {
    if (lesions.length === 0) {
      return { daysSince: null as number | null, totalScans: 0, streak: 0 };
    }
    const sorted = [...lesions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const last = new Date(sorted[0].createdAt);
    const days = daysBetween(last, new Date());
    return { daysSince: days, totalScans: lesions.length, streak: uniqueScanDays(lesions) };
  }, [lesions]);

  const confettiFire = useStreakMilestone(streak);
  const ctaScale = useSharedValue(1);
  const iconBounce = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    iconBounce.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0,  { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [reduce, iconBounce]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: iconBounce.value }] }));
  const ctaStyle  = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const headlineNum = daysSince == null ? '—' : daysSince === 0 ? 'Today' : daysSince;
  const headlineSub = daysSince == null
    ? 'No scans yet'
    : daysSince === 0
      ? 'since last check'
      : daysSince === 1 ? 'day since last check' : 'days since last check';

  return (
    <View style={s.card}>
      <Confetti fire={confettiFire} />
      <View style={s.headRow}>
        <Animated.View style={[s.iconBg, iconStyle]}>
          <Feather name="calendar" size={16} color={C.primary} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Self-Exam</Text>
          <Text style={s.sub}>Monthly check-ins catch changes early</Text>
        </View>
        {streak >= 3 && (
          <View style={s.streakPill}>
            <Text style={s.streakTxt}>🔥 {streak}</Text>
          </View>
        )}
      </View>

      <View style={s.body}>
        <View style={s.metric}>
          <Text style={s.metricNum}>{headlineNum}</Text>
          <Text style={s.metricLbl}>{headlineSub}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.metric}>
          <Text style={s.metricNum}>{totalScans}</Text>
          <Text style={s.metricLbl}>total scans logged</Text>
        </View>
      </View>

      <Animated.View style={ctaStyle}>
        <Pressable
          style={s.cta}
          onPress={() => router.push('/camera')}
          onPressIn={() => { if (!reduce) ctaScale.value = withTiming(0.97, { duration: 80 }); }}
          onPressOut={() => { if (!reduce) ctaScale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}>
          <Feather name="aperture" size={14} color="#fff" />
          <Text style={s.ctaTxt}>
            {daysSince == null ? 'Log first scan' : 'New lesion scan'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: Space[5],
    marginBottom: Space[5],
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Space[4],
    ...Shadow.xs,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Space[3], marginBottom: Space[3] },
  iconBg: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: FontSize.base, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  sub:   { fontSize: FontSize.xs, color: C.muted, marginTop: 1 },

  streakPill: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  streakTxt: { fontSize: 11, fontWeight: '800', color: '#B45309' },

  body: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    borderRadius: Radius.lg,
    paddingVertical: Space[3],
    paddingHorizontal: Space[4],
    marginBottom: Space[3],
  },
  metric: { flex: 1, alignItems: 'center' },
  metricNum: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
    lineHeight: 28,
  },
  metricLbl: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  divider: { width: 1, height: 32, backgroundColor: C.border },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: C.primary,
  },
  ctaTxt: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
});
