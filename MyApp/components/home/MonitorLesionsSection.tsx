import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C, FontSize, Space, Radius, Shadow } from '@/constants/theme';
import { useLesions, type Lesion } from '@/hooks/useLesions';
import { syncUrgentLesionAlerts } from '@/lib/notificationScheduler';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelfExamCard } from '@/components/home/SelfExamCard';

type StatusKey = 'Stable' | 'Check' | 'Urgent';

export function MonitorLesionsSection() {
  const router = useRouter();
  const { lesions, loading, error, fetchLesions } = useLesions();

  useEffect(() => {
    void fetchLesions();
  }, [fetchLesions]);

  useEffect(() => {
    if (lesions.length === 0) return;
    void syncUrgentLesionAlerts(lesions);
  }, [lesions]);

  const lesionStats = useMemo(() => {
    const stats = { Stable: 0, Check: 0, Urgent: 0 } as Record<StatusKey, number>;
    lesions.forEach(l => { stats[l.status] = (stats[l.status] ?? 0) + 1; });
    return stats;
  }, [lesions]);

  const recentLesions = useMemo(
    () =>
      [...lesions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [lesions],
  );

  return (
    <>
      <SectionHeader
        title="Lesion Log"
        subtitle="Track size, shape, and colour over time."
        linkLabel="View all"
        onLinkPress={() => router.push('/history')}
      />

      <View style={ls.statsRow}>
        <StatPill label="Stable" count={lesionStats.Stable} bg={C.stableBg} color={C.stableText} />
        <StatPill label="Check"  count={lesionStats.Check}  bg={C.checkBg}  color={C.checkText} />
        <StatPill label="Urgent" count={lesionStats.Urgent} bg={C.urgentBg} color={C.urgentText} />
      </View>

      <SelfExamCard />

      {lesions.length > 0 && (
        <TouchableOpacity
          style={ls.bodyMapCta}
          activeOpacity={0.85}
          onPress={() => router.push('/body-map')}>
          <View style={ls.bodyMapIcon}>
            <Feather name="map" size={16} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ls.bodyMapTitle}>Body Map</Text>
            <Text style={ls.bodyMapSub}>Plot lesions on a front/back silhouette</Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.textHint} />
        </TouchableOpacity>
      )}

      {loading && (
        <View style={ls.stateWrap}>
          <EmptyState icon="clock" title="Loading lesions…" />
        </View>
      )}

      {!loading && error && (
        <View style={ls.stateWrap}>
          <EmptyState
            icon="alert-circle"
            title="Could not load lesions"
            message={error}
            actionLabel="Retry"
            onAction={() => void fetchLesions()}
            variant="error"
          />
        </View>
      )}

      {!loading && !error && recentLesions.length > 0 && (
        <View style={ls.recentCard}>
          <View style={ls.recentHead}>
            <Text style={ls.recentHeading}>Recent entries</Text>
            <TouchableOpacity onPress={() => router.push('/history')} hitSlop={6}>
              <Text style={ls.recentLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentLesions.map((item, idx) => (
            <React.Fragment key={item._id}>
              <LesionRow item={item} onPress={() => router.push('/history')} />
              {idx < recentLesions.length - 1 && <View style={ls.rowDivider} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {!loading && !error && lesions.length === 0 && (
        <View style={ls.stateWrap}>
          <EmptyState
            icon="inbox"
            title="No lesions logged yet"
            message="Start by logging a new check-in from your Self-Exam card above."
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

function LesionRow({ item, onPress }: { item: Lesion; onPress: () => void }) {
  const dateStr = new Date(item.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity style={ls.lesRow} onPress={onPress} activeOpacity={0.75}>
      <View style={ls.thumbFrame}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={ls.lesThumb} resizeMode="cover" />
        ) : (
          <View style={[ls.lesThumb, ls.lesThumbPlaceholder]}>
            <Feather name="image" size={20} color={C.primary} />
          </View>
        )}
      </View>

      <View style={ls.lesContent}>
        <Text style={ls.lesName} numberOfLines={1}>{item.title || 'Untitled lesion'}</Text>
        <View style={ls.lesMetaRow}>
          {!!item.location && (
            <View style={ls.lesMetaItem}>
              <Feather name="map-pin" size={11} color={C.muted} />
              <Text style={ls.lesMeta} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          <View style={ls.lesMetaItem}>
            <Feather name="calendar" size={11} color={C.muted} />
            <Text style={ls.lesMeta}>{dateStr}</Text>
          </View>
        </View>
        <View style={{ marginTop: 6 }}>
          <StatusBadge status={item.status} size="sm" />
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

  bodyMapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    marginHorizontal: Space[5],
    marginBottom: Space[5],
    paddingVertical: Space[3] + 2,
    paddingHorizontal: Space[4],
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.xs,
  },
  bodyMapIcon: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  bodyMapTitle: { fontSize: FontSize.sm + 1, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  bodyMapSub:   { fontSize: FontSize.xs, color: C.muted, marginTop: 2 },
});
