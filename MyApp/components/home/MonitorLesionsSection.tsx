import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';
import { useLesions, type Lesion } from '@/hooks/useLesions';
import { syncUrgentLesionAlerts } from '@/lib/notificationScheduler';

const statusMeta: Record<'Stable' | 'Check' | 'Urgent', { label: string; color: string; bg: string }> = {
  Stable: { label: 'Stable', color: C.stableText, bg: C.stableBg },
  Check:  { label: 'Check',  color: C.checkText,  bg: C.checkBg  },
  Urgent: { label: 'Urgent', color: C.urgentText,  bg: C.urgentBg },
};

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
    const stats = { Stable: 0, Check: 0, Urgent: 0 };
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
      {/* HEADER */}
      <View style={ls.secHead}>
        <View style={ls.secHeadText}>
          <Text style={ls.secTitle}>Monitor Lesions</Text>
          <Text style={ls.secDesc}>
            Scan and log spots to track size, shape, and colour over time.
          </Text>
        </View>
        <TouchableOpacity style={ls.secLinkRow} onPress={() => router.push('/history')}>
          <Text style={ls.secLink}>View all</Text>
          <Feather name="chevron-right" size={14} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* CARD */}
      <View style={ls.lesCard}>
        {loading && (
          <ActivityIndicator size="small" color={C.sageDark} style={{ marginBottom: 10 }} />
        )}
        {!loading && error && (
          <View style={ls.errorBox}>
            <Feather name="alert-circle" size={16} color={C.urgentText} />
            <Text style={ls.errorTxt}>Could not load lesions</Text>
            <TouchableOpacity onPress={() => void fetchLesions()} style={ls.retryBtn}>
              <Text style={ls.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STATS */}
        <View style={ls.lesResultsBlock}>
          <Text style={ls.lesResultsTitle}>Monitoring</Text>
          <Text style={ls.lesResultsDesc}>
            {lesions.length} lesion{lesions.length === 1 ? '' : 's'} logged — keep scanning on schedule.
          </Text>
          <View style={ls.lesResultsPills}>
            <StatPill label="Stable" count={lesionStats.Stable} bg={C.stableBg} color={C.stableText} />
            <StatPill label="Check"  count={lesionStats.Check}  bg={C.checkBg}  color={C.checkText}  />
            <StatPill label="Urgent" count={lesionStats.Urgent} bg={C.urgentBg} color={C.urgentText} />
          </View>
        </View>

        {/* SCAN BUTTON */}
        <TouchableOpacity style={ls.scanBanner} onPress={() => router.push('/camera')}>
          <View style={ls.scanIconWrap}>
            <Feather name="camera" size={20} color={C.sageDark} />
          </View>
          <View style={ls.scanBody}>
            <Text style={ls.scanTitle}>Scan a new lesion</Text>
            <Text style={ls.scanSub}>Log & track changes over time</Text>
          </View>
          <Feather name="chevron-right" size={22} color={C.sageMid} />
        </TouchableOpacity>

        {/* RECENT LIST */}
        {recentLesions.length > 0 && (
          <>
            <View style={ls.divider} />
            <Text style={ls.lesListTitle}>RECENT LESIONS</Text>
            {recentLesions.map(item => (
              <LesionRow key={item._id} item={item} onPress={() => router.push('/history')} />
            ))}
          </>
        )}

        {/* DISCLAIMER */}
        <View style={ls.disclaimer}>
          <Text style={ls.disclaimerTxt}>
            For tracking only. Always consult a dermatologist for medical advice.
          </Text>
        </View>
      </View>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, count, bg, color }: { label: string; count: number; bg: string; color: string }) {
  return (
    <View style={[ls.lesResultPill, { backgroundColor: bg }]}>
      <View style={[ls.lesResultPillDot, { backgroundColor: color }]} />
      <Text style={[ls.lesResultPillTxt, { color }]}>
        {label} {count}
      </Text>
    </View>
  );
}

function LesionRow({ item, onPress }: { item: Lesion; onPress: () => void }) {
  const meta = statusMeta[item.status] ?? statusMeta.Stable;
  return (
    <TouchableOpacity style={ls.lesRow} onPress={onPress} activeOpacity={0.7}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={ls.lesThumb} resizeMode="cover" />
      ) : (
        <View style={[ls.lesThumb, ls.lesThumbPlaceholder]}>
          <Feather name="image" size={18} color={C.muted} />
        </View>
      )}
      <View style={ls.lesContent}>
        <View style={ls.lesTop}>
          <Text style={ls.lesName} numberOfLines={1}>
            {item.title}{item.location ? ` · ${item.location}` : ''}
          </Text>
          <View style={[ls.lesBadge, { backgroundColor: meta.bg }]}>
            <Text style={[ls.lesBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={ls.lesDate}>
          {new Date(item.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </Text>
        {!!(item.notes || item.description) && (
          <Text style={ls.lesNote} numberOfLines={2}>{item.notes || item.description}</Text>
        )}
      </View>
      <Feather name="chevron-right" size={16} color={C.muted} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ls = StyleSheet.create({
  secHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 22, marginBottom: 10, gap: 12,
  },
  secHeadText: { flex: 1, minWidth: 0 },
  secTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  secDesc: { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 17 },
  secLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  secLink: { fontSize: 12, color: C.text, fontWeight: '500' },

  lesCard: {
    marginHorizontal: 18, backgroundColor: C.white, borderRadius: 28, padding: 18,
    borderWidth: 1, borderColor: C.lesCardBorder,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#1A1A18', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.urgentBg, borderRadius: 10, padding: 10, marginBottom: 10,
  },
  errorTxt: { flex: 1, fontSize: 12, color: C.urgentText },
  retryBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: C.white, borderRadius: 6,
    borderWidth: 1, borderColor: C.urgentText + '40',
  },
  retryTxt: { fontSize: 12, fontWeight: '600', color: C.urgentText },

  lesResultsBlock: {
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  lesResultsTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  lesResultsDesc: { fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 17 },
  lesResultsPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  lesResultPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99,
  },
  lesResultPillDot: { width: 6, height: 6, borderRadius: 3 },
  lesResultPillTxt: { fontSize: 11, fontWeight: '600' },

  scanBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.cardGray, borderRadius: 18, padding: 13,
  },
  scanIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: C.sage,
    alignItems: 'center', justifyContent: 'center',
  },
  scanBody: { flex: 1 },
  scanTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  scanSub: { fontSize: 11, color: C.muted, marginTop: 1 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 13 },
  lesListTitle: { fontSize: 9, letterSpacing: 1.2, color: C.muted, marginBottom: 10 },

  lesRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    marginBottom: 12, paddingVertical: 2,
  },
  lesThumb: { width: 46, height: 46, borderRadius: 10, overflow: 'hidden' },
  lesThumbPlaceholder: {
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  lesContent: { flex: 1 },
  lesTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 2,
  },
  lesName: { fontSize: 12, fontWeight: '500', color: C.text, flex: 1, marginRight: 6 },
  lesBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  lesBadgeTxt: { fontSize: 9, fontWeight: '600' },
  lesDate: { fontSize: 10, color: C.muted, marginBottom: 1 },
  lesNote: { fontSize: 10, color: C.muted, lineHeight: 15 },

  disclaimer: {
    backgroundColor: C.warnBg, borderRadius: 10, borderLeftWidth: 3,
    borderLeftColor: C.warnBorder, padding: 10, marginTop: 8,
  },
  disclaimerTxt: { fontSize: 10, color: C.warnText, lineHeight: 15 },
});
