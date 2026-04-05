import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';

export interface LesionEntry {
  id: string;
  label: string;
  date: string;
  status: 'stable' | 'check' | 'urgent';
  note: string;
}

const statusMeta: Record<LesionEntry['status'], { label: string; color: string; bg: string }> = {
  stable: { label: 'Stable', color: C.stableText, bg: C.stableBg },
  check: { label: 'Check', color: C.checkText, bg: C.checkBg },
  urgent: { label: 'Urgent', color: C.urgentText, bg: C.urgentBg },
};

function LesionRow({ item }: { item: LesionEntry }) {
  const meta = statusMeta[item.status];
  return (
    <View style={ls.lesRow}>
      <View style={ls.lesThumb}>
        <Text style={ls.lesThumbTxt}>LS</Text>
      </View>
      <View style={ls.lesContent}>
        <View style={ls.lesTop}>
          <Text style={ls.lesName}>{item.label}</Text>
          <View style={[ls.lesBadge, { backgroundColor: meta.bg }]}>
            <Text style={[ls.lesBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={ls.lesDate}>{item.date}</Text>
        <Text style={ls.lesNote}>{item.note}</Text>
      </View>
    </View>
  );
}

export function MonitorLesionsSection() {
  const router = useRouter();
  const lesions = useMemo<LesionEntry[]>(
    () => [
      {
        id: '1',
        label: 'Mole · left forearm',
        date: 'Last checked 12 Mar 2025',
        status: 'stable',
        note: 'No change in size or colour.',
      },
      {
        id: '2',
        label: 'Patch · right shoulder',
        date: 'Last checked 28 Mar 2025',
        status: 'check',
        note: 'Slight edge irregularity — schedule a review.',
      },
      {
        id: '3',
        label: 'Spot · upper back',
        date: 'Added 29 Mar 2025',
        status: 'urgent',
        note: 'Rapid change vs last scan — see a dermatologist as soon as you can.',
      },
    ],
    [],
  );

  const lesionStats = useMemo(() => {
    let stable = 0;
    let check = 0;
    let urgent = 0;
    for (const l of lesions) {
      if (l.status === 'stable') stable += 1;
      else if (l.status === 'check') check += 1;
      else urgent += 1;
    }
    return { stable, check, urgent, total: lesions.length };
  }, [lesions]);

  return (
    <>
      <View style={ls.secHead}>
        <View style={ls.secHeadText}>
          <Text style={ls.secTitle}>Monitor Lesions</Text>
          <Text style={ls.secDesc}>
            Scan and log spots to track size, shape, and colour over time.
          </Text>
        </View>
        <TouchableOpacity style={ls.secLinkRow} activeOpacity={0.7} hitSlop={8} onPress={() => router.push('/history')}>
          <Text style={ls.secLink}>View all</Text>
          <Feather name="chevron-right" size={14} color={C.text} />
        </TouchableOpacity>
      </View>
      <View style={ls.lesCard}>
        <View style={ls.lesResultsBlock}>
          <Text style={ls.lesResultsTitle}>Monitoring</Text>
          <Text style={ls.lesResultsDesc}>
            {lesionStats.total} lesion{lesionStats.total === 1 ? '' : 's'} logged — keep scanning on
            schedule.
          </Text>
          <View style={ls.lesResultsPills}>
            <View style={[ls.lesResultPill, { backgroundColor: C.stableBg }]}>
              <View style={[ls.lesResultPillDot, { backgroundColor: C.stableText }]} />
              <Text style={[ls.lesResultPillTxt, { color: C.stableText }]}>
                Stable {lesionStats.stable}
              </Text>
            </View>
            <View style={[ls.lesResultPill, { backgroundColor: C.checkBg }]}>
              <View style={[ls.lesResultPillDot, { backgroundColor: C.checkText }]} />
              <Text style={[ls.lesResultPillTxt, { color: C.checkText }]}>
                Check {lesionStats.check}
              </Text>
            </View>
            <View style={[ls.lesResultPill, { backgroundColor: C.urgentBg }]}>
              <View style={[ls.lesResultPillDot, { backgroundColor: C.urgentText }]} />
              <Text style={[ls.lesResultPillTxt, { color: C.urgentText }]}>
                Urgent {lesionStats.urgent}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={ls.scanBanner} onPress={() => router.push('/camera')} activeOpacity={0.85}>
          <View style={ls.scanIconWrap}>
            <Feather name="camera" size={20} color={C.sageDark} />
          </View>
          <View style={ls.scanBody}>
            <Text style={ls.scanTitle}>Scan a new lesion</Text>
            <Text style={ls.scanSub}>Log & track changes over time</Text>
          </View>
          <Feather name="chevron-right" size={22} color={C.sageMid} style={ls.scanArrowIcon} />
        </TouchableOpacity>

        <View style={ls.divider} />
        <Text style={ls.lesListTitle}>LOGGED LESIONS</Text>

        {lesions.map(item => (
          <LesionRow key={item.id} item={item} />
        ))}

        <View style={ls.disclaimer}>
          <Text style={ls.disclaimerTxt}>
            For tracking only. Always consult a dermatologist for medical advice.
          </Text>
        </View>
      </View>
    </>
  );
}

const ls = StyleSheet.create({
  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    marginBottom: 10,
    gap: 12,
  },
  secHeadText: { flex: 1, minWidth: 0 },
  secTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  secDesc: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    lineHeight: 17,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  secLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  secLink: {
    fontSize: 12,
    color: C.text,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  lesCard: {
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: C.lesCardBorder,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#1A1A18',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        }
      : Platform.OS === 'android'
        ? { elevation: 3 }
        : { boxShadow: '0 3px 16px rgba(0,0,0,0.06)' }),
  },
  lesResultsBlock: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  lesResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.diagLine,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesResultsDesc: {
    fontSize: 12,
    color: C.muted,
    marginTop: 6,
    lineHeight: 17,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesResultsPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  lesResultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  lesResultPillDot: { width: 6, height: 6, borderRadius: 3 },
  lesResultPillTxt: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.cardGray,
    borderRadius: 18,
    padding: 13,
  },
  scanIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scanBody: { flex: 1 },
  scanTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  scanSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  scanArrowIcon: { flexShrink: 0 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 13 },
  lesListTitle: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: C.muted,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  lesThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lesThumbTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesContent: { flex: 1 },
  lesTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 },
  lesName: {
    fontSize: 12,
    fontWeight: '500',
    color: C.text,
    flex: 1,
    marginRight: 6,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  lesBadgeTxt: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesDate: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 1,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesNote: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 15,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  disclaimer: {
    backgroundColor: C.warnBg,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.warnBorder,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 10,
    marginTop: 4,
  },
  disclaimerTxt: {
    fontSize: 10,
    color: C.warnText,
    lineHeight: 15,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
});
