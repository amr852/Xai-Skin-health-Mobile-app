import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C, FontSize, Radius, Shadow, Space } from '@/constants/theme';
import { useLesions } from '@/hooks/useLesions';

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const aUTC = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUTC = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((bUTC - aUTC) / msPerDay);
}

export function SelfExamCard() {
  const router = useRouter();
  const { lesions, fetchLesions } = useLesions();

  useEffect(() => { void fetchLesions(); }, [fetchLesions]);

  const { daysSince, totalScans } = useMemo(() => {
    if (lesions.length === 0) {
      return { daysSince: null as number | null, totalScans: 0 };
    }
    const sorted = [...lesions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const last = new Date(sorted[0].createdAt);
    const days = daysBetween(last, new Date());
    return { daysSince: days, totalScans: lesions.length };
  }, [lesions]);

  const headlineNum = daysSince == null ? '—' : daysSince === 0 ? 'Today' : daysSince;
  const headlineSub = daysSince == null
    ? 'No scans yet'
    : daysSince === 0
      ? 'since last check'
      : daysSince === 1 ? 'day since last check' : 'days since last check';

  return (
    <View style={s.card}>
      <View style={s.headRow}>
        <View style={s.iconBg}>
          <Feather name="calendar" size={16} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Self-Exam</Text>
          <Text style={s.sub}>Monthly check-ins catch changes early</Text>
        </View>
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

      <Pressable
        style={({ pressed }) => [s.cta, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.push('/camera')}>
        <Feather name="aperture" size={14} color="#fff" />
        <Text style={s.ctaTxt}>
          {daysSince == null ? 'Log first scan' : 'New lesion scan'}
        </Text>
      </Pressable>
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
