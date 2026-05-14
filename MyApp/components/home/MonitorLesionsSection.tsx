import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, useFocusEffect } from 'expo-router';
import { C, FontSize, Space, Radius, Shadow } from '@/constants/theme';
import { useLesions } from '@/hooks/useLesions';
import { useScanSessions, type ScanSession } from '@/hooks/useScanSessions';
import { syncUrgentLesionAlerts } from '@/lib/notificationScheduler';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelfExamCard } from '@/components/home/SelfExamCard';

type StatusKey = 'Stable' | 'Check' | 'Urgent';

function mapModelSeverityToStatus(s?: string): StatusKey {
  const k = (s || '').toLowerCase();
  if (k === 'urgent') return 'Urgent';
  if (k === 'stable') return 'Stable';
  return 'Check';
}

function deriveScanTitle(item: ScanSession): string {
  if (item.noLesionFound) return 'No lesion detected';
  const top = item.lesions?.[0]?.diagnosis?.label;
  if (typeof top === 'string' && top.trim()) {
    const t = top.trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return 'Skin scan';
}

function scanStatus(item: ScanSession): StatusKey {
  return mapModelSeverityToStatus(item.lesions?.[0]?.severity);
}

export function MonitorLesionsSection() {
  const router = useRouter();
  const { sessions, loading, error, fetchSessions } = useScanSessions();

  // Saved-lesion records still drive Urgent push alerts. We fetch them here
  // purely for that side effect — nothing from `useLesions` is rendered.
  const { lesions, fetchLesions } = useLesions();

  useFocusEffect(
    useCallback(() => {
      void fetchSessions();
      void fetchLesions();
    }, [fetchSessions, fetchLesions]),
  );

  useEffect(() => {
    if (lesions.length === 0) return;
    void syncUrgentLesionAlerts(lesions);
  }, [lesions]);

  const scanStats = useMemo(() => {
    const stats = { Stable: 0, Check: 0, Urgent: 0 } as Record<StatusKey, number>;
    sessions.forEach((s) => {
      stats[scanStatus(s)] += 1;
    });
    return stats;
  }, [sessions]);

  const recentScans = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [sessions],
  );

  return (
    <>
      <SectionHeader
        title="Skin Scans"
        subtitle="Severity breakdown across every scan you've run."
        linkLabel="View all"
        onLinkPress={() => router.push('/history')}
      />

      <View style={ls.statsRow}>
        <StatPill label="Stable" count={scanStats.Stable} bg={C.stableBg} color={C.stableText} />
        <StatPill label="Check"  count={scanStats.Check}  bg={C.checkBg}  color={C.checkText} />
        <StatPill label="Urgent" count={scanStats.Urgent} bg={C.urgentBg} color={C.urgentText} />
      </View>

      <SelfExamCard />

      {loading && (
        <View style={ls.stateWrap}>
          <EmptyState icon="clock" title="Loading scans…" />
        </View>
      )}

      {!loading && error && (
        <View style={ls.stateWrap}>
          <EmptyState
            icon="alert-circle"
            title="Could not load scans"
            message={error}
            actionLabel="Retry"
            onAction={() => void fetchSessions()}
            variant="error"
          />
        </View>
      )}

      {!loading && !error && recentScans.length > 0 && (
        <View style={ls.recentCard}>
          <View style={ls.recentHead}>
            <Text style={ls.recentHeading}>Recent scans</Text>
            <TouchableOpacity onPress={() => router.push('/history')} hitSlop={6}>
              <Text style={ls.recentLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentScans.map((item, idx) => (
            <React.Fragment key={item._id}>
              <ScanRow item={item} onPress={() => router.push('/history')} />
              {idx < recentScans.length - 1 && <View style={ls.rowDivider} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {!loading && !error && sessions.length === 0 && (
        <View style={ls.stateWrap}>
          <EmptyState
            icon="inbox"
            title="No scans logged yet"
            message="Start by running a check-in from your Self-Exam card above."
          />
        </View>
      )}
    </>
  );
}

function StatPill({
  label, count, bg, color,
}: { label: string; count: number; bg: string; color: string }) {
  return (
    <View style={[ls.statPill, { backgroundColor: bg }]}>
      <Text style={[ls.statCount, { color }]}>{count}</Text>
      <Text style={[ls.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function ScanRow({ item, onPress }: { item: ScanSession; onPress: () => void }) {
  const dateStr = new Date(item.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const title = deriveScanTitle(item);
  const status = scanStatus(item);
  const regionCount = item.lesionCount || item.lesions?.length || 0;

  return (
    <TouchableOpacity style={ls.lesRow} onPress={onPress} activeOpacity={0.75}>
      <View style={ls.thumbFrame}>
        {item.originalImageUrl ? (
          <Image source={{ uri: item.originalImageUrl }} style={ls.lesThumb} resizeMode="cover" />
        ) : (
          <View style={[ls.lesThumb, ls.lesThumbPlaceholder]}>
            <Feather name="image" size={20} color={C.primary} />
          </View>
        )}
      </View>

      <View style={ls.lesContent}>
        <Text style={ls.lesName} numberOfLines={1}>{title}</Text>
        <View style={ls.lesMetaRow}>
          {regionCount > 0 ? (
            <View style={ls.lesMetaItem}>
              <Feather name="layers" size={11} color={C.muted} />
              <Text style={ls.lesMeta}>
                {regionCount} {regionCount === 1 ? 'region' : 'regions'}
              </Text>
            </View>
          ) : null}
          <View style={ls.lesMetaItem}>
            <Feather name="calendar" size={11} color={C.muted} />
            <Text style={ls.lesMeta}>{dateStr}</Text>
          </View>
        </View>
        <View style={{ marginTop: 6 }}>
          <StatusBadge status={status} size="sm" />
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={C.textHint} />
    </TouchableOpacity>
  );
}

const ls = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Space[3],
    paddingHorizontal: Space[5],
    marginBottom: Space[4],
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Space[3],
    borderRadius: Radius.lg,
    gap: 3,
  },
  statCount: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, fontWeight: '600' },

  stateWrap: { marginBottom: Space[2] },

  recentCard: {
    marginHorizontal: Space[5],
    marginBottom: Space[5],
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    padding: Space[4],
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.xs,
  },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space[3],
  },
  recentHeading: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  recentLink: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.3,
  },

  lesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingVertical: Space[2] + 2,
  },
  thumbFrame: {
    padding: 2,
    borderRadius: Radius.md + 2,
    backgroundColor: C.primaryLight,
  },
  lesThumb: {
    width: 58, height: 58,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: C.cardGray,
  },
  lesThumbPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryLight,
  },
  lesContent: { flex: 1, minWidth: 0 },
  lesName:    { fontSize: FontSize.sm + 1, fontWeight: '700', color: C.text, marginBottom: 4, letterSpacing: -0.2 },
  lesMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, rowGap: 2 },
  lesMetaItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  lesMeta:    { fontSize: FontSize.xs, color: C.muted },

  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: Space[1] },
});
