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
import { DisclaimerBox } from '@/components/ui/DisclaimerBox';
import { EmptyState } from '@/components/ui/EmptyState';

type StatusKey = 'Stable' | 'Check' | 'Urgent';

export function MonitorLesionsSection() {
  const router = useRouter();
  const { lesions, loading, error, fetchLesions } = useLesions();

  useEffect(() => {
    void fetchLesions();
  }, [fetchLesions]);

  // Send urgent notifications + inbox items whenever lesions load
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
      {/* ── Section Header ── */}
      <SectionHeader
        title="Monitor Lesions"
        subtitle="Scan and log spots to track size, shape, and colour over time."
        linkLabel="View all"
        onLinkPress={() => router.push('/history')}
      />

      {/* ── Stats Pills Row ── */}
      <View style={ls.statsRow}>
        <StatPill
          label="Stable"
          count={lesionStats.Stable}
          bg={C.stableBg}
          color={C.stableText}
        />
        <StatPill
          label="Check"
          count={lesionStats.Check}
          bg={C.checkBg}
          color={C.checkText}
        />
        <StatPill
          label="Urgent"
          count={lesionStats.Urgent}
          bg={C.urgentBg}
          color={C.urgentText}
        />
      </View>

      {/* ── Loading / Error states ── */}
      {loading && (
        <View style={ls.loadingWrap}>
          <EmptyState
            icon="clock"
            title="Loading lesions…"
          />
        </View>
      )}

      {!loading && error && (
        <View style={ls.errorWrap}>
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

      {/* ── Scan a new lesion banner ── */}
      {!loading && !error && (
        <TouchableOpacity
          style={ls.scanBanner}
          onPress={() => router.push('/camera')}
          activeOpacity={0.8}>
          {/* Camera icon circle */}
          <View style={ls.scanIconCircle}>
            <Feather name="camera" size={22} color="#fff" />
          </View>
          {/* Text */}
          <View style={ls.scanTextBlock}>
            <Text style={ls.scanTitle}>Scan a new lesion</Text>
            <Text style={ls.scanSub}>Log &amp; track changes over time</Text>
          </View>
          {/* Arrow */}
          <View style={ls.scanArrowCircle}>
            <Feather name="arrow-right" size={16} color={C.primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* ── Recent Lesions ── */}
      {!loading && !error && recentLesions.length > 0 && (
        <View style={ls.recentCard}>
          <Text style={ls.recentHeading}>Recent Lesions</Text>
          {recentLesions.map((item, idx) => (
            <React.Fragment key={item._id}>
              <LesionRow
                item={item}
                onPress={() => router.push('/history')}
              />
              {idx < recentLesions.length - 1 && <View style={ls.rowDivider} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── Empty state when no lesions ── */}
      {!loading && !error && lesions.length === 0 && (
        <View style={ls.emptyWrap}>
          <EmptyState
            icon="inbox"
            title="No lesions logged yet"
            message="Tap 'Scan a new lesion' above to add your first one."
          />
        </View>
      )}

      {/* ── Disclaimer ── */}
      <DisclaimerBox />
    </>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({
  label, count, bg, color,
}: {
  label: string; count: number; bg: string; color: string;
}) {
  return (
    <View style={[ls.statPill, { backgroundColor: bg }]}>
      <Text style={[ls.statCount, { color }]}>{count}</Text>
      <Text style={[ls.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Lesion Row ─────────────────────────────────────────────────────────────────
function LesionRow({ item, onPress }: { item: Lesion; onPress: () => void }) {
  return (
    <TouchableOpacity style={ls.lesRow} onPress={onPress} activeOpacity={0.7}>
      {/* 64px thumbnail */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={ls.lesThumb} resizeMode="cover" />
      ) : (
        <View style={[ls.lesThumb, ls.lesThumbPlaceholder]}>
          <Feather name="image" size={20} color={C.muted} />
        </View>
      )}

      {/* Title / location / date */}
      <View style={ls.lesContent}>
        <Text style={ls.lesName} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        {!!item.location && (
          <View style={ls.lesMetaItem}>
            <Feather name="map-pin" size={11} color={C.muted} />
            <Text style={ls.lesMeta}>{item.location}</Text>
          </View>
        )}
        <Text style={ls.lesDate}>
          {new Date(item.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>

      {/* Status badge */}
      <StatusBadge status={item.status} size="sm" />
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const ls = StyleSheet.create({
  // Stats pills row
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
  statCount: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  loadingWrap: { marginBottom: Space[2] },
  errorWrap:   { marginBottom: Space[2] },
  emptyWrap:   { marginBottom: Space[2] },

  // Scan banner
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Space[5],
    marginBottom: Space[4],
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    padding: Space[4],
    borderWidth: 1,
    borderColor: C.border,
    gap: Space[3],
    ...Shadow.sm,
  },
  scanIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  scanTextBlock: { flex: 1 },
  scanTitle:  { fontSize: FontSize.base, fontWeight: '700', color: C.text },
  scanSub:    { fontSize: FontSize.xs + 1, color: C.muted, marginTop: 2 },
  scanArrowCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // Recent lesions card
  recentCard: {
    marginHorizontal: Space[5],
    marginBottom: Space[4],
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    padding: Space[4],
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.xs,
  },
  recentHeading: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Space[3],
  },

  // Lesion row
  lesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingVertical: Space[2],
  },
  lesThumb: {
    width: 64, height: 64,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: C.cardGray,
  },
  lesThumbPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
  },
  lesContent: { flex: 1, minWidth: 0 },
  lesName:    { fontSize: FontSize.sm + 1, fontWeight: '600', color: C.text, marginBottom: 3 },
  lesMetaItem:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  lesMeta:    { fontSize: FontSize.xs, color: C.muted },
  lesDate:    { fontSize: FontSize.xs, color: C.muted },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: Space[1] },
});
