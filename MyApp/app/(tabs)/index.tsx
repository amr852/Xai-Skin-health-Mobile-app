import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { luminaPalette as palette } from '@/constants/palette';

const C = {
  ...palette,
  muted: palette.textMuted,
  good: '#5BAB7E',
  warn: '#D4922B',
  info: '#7B6FD4',
};

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  unit: string;
  status: string;
  statusColor: string;
  fillColor: string;
  fillPct: number;
  bgColor: string;
}

interface TipCardProps {
  icon: string;
  title: string;
  body: string;
  tag: string;
  tagColor: string;
}

interface LesionEntry {
  id: string;
  label: string;
  date: string;
  status: 'stable' | 'check' | 'new';
  note: string;
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  status,
  statusColor,
  fillColor,
  fillPct,
  bgColor,
}: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: bgColor }]}>
        <Text style={styles.metricIconText}>{icon}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value}
        <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
      <Text style={[styles.metricStatus, { color: statusColor }]}>● {status}</Text>
      <View style={styles.miniBarBg}>
        <View style={[styles.miniBarFill, { width: `${fillPct}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

function TipCard({ icon, title, body, tag, tagColor }: TipCardProps) {
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipCardTop}>
        <View style={styles.tipIconWrap}>
          <Text style={styles.tipIcon}>{icon}</Text>
        </View>
        <View style={[styles.tipTag, { backgroundColor: `${tagColor}22` }]}>
          <Text style={[styles.tipTagText, { color: tagColor }]}>{tag}</Text>
        </View>
      </View>
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipBody}>{body}</Text>
    </View>
  );
}

const statusMeta: Record<LesionEntry['status'], { label: string; color: string }> = {
  stable: { label: 'Stable', color: C.good },
  check: { label: 'Check', color: C.warn },
  new: { label: 'New', color: C.info },
};

function LesionRow({ item }: { item: LesionEntry }) {
  const meta = statusMeta[item.status];
  return (
    <View style={styles.lesionRow}>
      <View style={styles.lesionThumb}>
        <Text style={styles.lesionThumbIcon}>LS</Text>
      </View>
      <View style={styles.lesionContent}>
        <View style={styles.lesionRowTop}>
          <Text style={styles.lesionLabel}>{item.label}</Text>
          <View style={[styles.lesionBadge, { backgroundColor: `${meta.color}22` }]}>
            <Text style={[styles.lesionBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.lesionDate}>{item.date}</Text>
        <Text style={styles.lesionNote}>{item.note}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [activeNav, setActiveNav] = useState<'home' | 'track' | 'routine' | 'profile'>('home');

  const metrics: MetricCardProps[] = [
    {
      icon: 'HY',
      label: 'Hydration',
      value: '72',
      unit: '%',
      status: 'Optimal',
      statusColor: C.good,
      fillColor: '#6EC3E0',
      fillPct: 72,
      bgColor: '#EAF4FB',
    },
    {
      icon: 'UV',
      label: 'UV Exposure',
      value: '45',
      unit: '%',
      status: 'Moderate',
      statusColor: C.warn,
      fillColor: '#F0B040',
      fillPct: 45,
      bgColor: '#FFF3E0',
    },
    {
      icon: 'SL',
      label: 'Sleep',
      value: '8.5',
      unit: 'h',
      status: 'Excellent',
      statusColor: C.info,
      fillColor: '#A89CE0',
      fillPct: 85,
      bgColor: '#EDE7F6',
    },
    {
      icon: 'BR',
      label: 'Barrier',
      value: '63',
      unit: '%',
      status: 'Healing',
      statusColor: C.good,
      fillColor: C.rose,
      fillPct: 63,
      bgColor: '#FCE4EC',
    },
  ];

  const tips: TipCardProps[] = [
    {
      icon: 'SP',
      title: 'Apply SPF every 2 hours',
      body: 'UV damage accumulates even on cloudy days. Reapplying SPF 50+ keeps your collagen intact.',
      tag: 'Prevention',
      tagColor: C.deepRose,
    },
    {
      icon: 'H2',
      title: 'Drink water before skincare',
      body: 'Hydrating from within boosts the effectiveness of your topical moisturiser by up to 30%.',
      tag: 'Hydration',
      tagColor: '#2E8DB5',
    },
    {
      icon: 'NT',
      title: 'Antioxidants reduce redness',
      body: 'Foods rich in vitamin C and E neutralise free radicals that cause inflammation and uneven tone.',
      tag: 'Nutrition',
      tagColor: C.good,
    },
    {
      icon: 'RC',
      title: 'Sleep is your repair window',
      body: 'Skin cell turnover peaks between 11 pm-4 am. A consistent sleep schedule maximises regeneration.',
      tag: 'Recovery',
      tagColor: C.info,
    },
  ];

  const lesions: LesionEntry[] = [
    {
      id: '1',
      label: 'Mole - left forearm',
      date: 'Last checked 12 Mar 2025',
      status: 'stable',
      note: 'No change in size or colour.',
    },
    {
      id: '2',
      label: 'Patch - right shoulder',
      date: 'Last checked 28 Mar 2025',
      status: 'check',
      note: 'Slight edge irregularity noted - schedule a review.',
    },
    {
      id: '3',
      label: 'Spot - upper back',
      date: 'Added 29 Mar 2025',
      status: 'new',
      note: 'New spot detected, baseline logged.',
    },
  ];

  const navItems = [
    { key: 'home', icon: 'HM', label: 'Home' },
    { key: 'track', icon: 'TR', label: 'Track' },
    { key: 'fab', icon: '+', label: '' },
    { key: 'routine', icon: 'RT', label: 'Routine' },
    { key: 'profile', icon: 'PF', label: 'Profile' },
  ] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.ivory} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            Lu<Text style={styles.logoAccent}>mi</Text>na
          </Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>LH</Text>
          </View>
        </View>

        <View style={styles.greetingWrap}>
          <Text style={styles.greetingSub}>Good morning, Layla</Text>
          <Text style={styles.greetingH1}>
            Your skin is <Text style={styles.greetingAccent}>glowing</Text> today
          </Text>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreBubble1} />
          <View style={styles.scoreBubble2} />
          <Text style={styles.scoreLabel}>OVERALL SKIN SCORE</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNum}>78</Text>
            <Text style={styles.scoreTrend}>
              <Text style={styles.scoreTrendStrong}>+4 pts</Text> this week
            </Text>
          </View>
          <View style={styles.scoreBarBg}>
            <View style={[styles.scoreBarFill, { width: '78%' }]} />
          </View>
          <Text style={styles.scoreDesc}>Your barrier function has improved - keep hydrating!</Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Skin Vitals</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Details →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.metricsGrid}>{metrics.map((m, i) => <MetricCard key={i} {...m} />)}</View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Daily Skin Tips</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>All tips →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tipsStrip}>
          {tips.map((t, i) => (
            <TipCard key={i} {...t} />
          ))}
        </ScrollView>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Monitor Skin Lesions</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>View all →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lesionCard}>
          <TouchableOpacity style={styles.scanBanner} activeOpacity={0.85}>
            <View style={styles.scanIconWrap}>
              <Text style={styles.scanIcon}>CAM</Text>
            </View>
            <View style={styles.scanBody}>
              <Text style={styles.scanTitle}>Scan a new lesion</Text>
              <Text style={styles.scanSub}>Use your camera to log and track changes over time</Text>
            </View>
            <Text style={styles.scanArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.lesionDivider} />

          <Text style={styles.lesionListTitle}>LOGGED LESIONS</Text>
          {lesions.map((item) => (
            <LesionRow key={item.id} item={item} />
          ))}

          <View style={styles.disclaimerWrap}>
            <Text style={styles.disclaimerText}>
              Important: This tool is for tracking purposes only. Always consult a dermatologist for medical
              advice.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.navBar}>
        {navItems.map((item) =>
          item.key === 'fab' ? (
            <TouchableOpacity key="fab" style={styles.fab} activeOpacity={0.85}>
              <Text style={styles.fabIcon}>{item.icon}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              onPress={() => setActiveNav(item.key as 'home' | 'track' | 'routine' | 'profile')}
              activeOpacity={0.7}>
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, activeNav === item.key && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.ivory,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 16,
  },
  logo: {
    fontSize: 26,
    fontWeight: '300',
    color: C.text,
    letterSpacing: 1,
    fontFamily: 'serif',
  },
  logoAccent: {
    color: C.deepRose,
    fontStyle: 'italic',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.petal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 12, fontWeight: '700', color: C.deepRose },
  greetingWrap: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  greetingSub: {
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.3,
  },
  greetingH1: {
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    marginTop: 2,
    lineHeight: 34,
    fontFamily: 'serif',
  },
  greetingAccent: {
    color: C.deepRose,
    fontStyle: 'italic',
  },
  scoreCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: C.rose,
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    shadowColor: C.deepRose,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreBubble1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scoreBubble2: {
    position: 'absolute',
    bottom: -20,
    right: 60,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  scoreLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.85)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  scoreNum: {
    fontSize: 64,
    fontWeight: '300',
    color: C.white,
    lineHeight: 64,
    fontFamily: 'serif',
  },
  scoreTrend: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    paddingBottom: 6,
  },
  scoreTrendStrong: { fontWeight: '600' },
  scoreBarBg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    height: 6,
    overflow: 'hidden',
  },
  scoreBarFill: {
    backgroundColor: C.white,
    height: '100%',
    borderRadius: 100,
  },
  scoreDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: C.text,
    fontFamily: 'serif',
  },
  sectionLink: {
    fontSize: 12,
    color: C.deepRose,
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 28,
  },
  metricCard: {
    width: '48%',
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    shadowColor: C.deepRose,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricIconText: { fontSize: 11, fontWeight: '700', color: C.deepRose },
  metricLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: C.muted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    lineHeight: 32,
    fontFamily: 'serif',
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'System',
  },
  metricStatus: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
  },
  miniBarBg: {
    height: 4,
    backgroundColor: C.sand,
    borderRadius: 100,
    marginTop: 10,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 100,
  },
  tipsStrip: {
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 28,
  },
  tipCard: {
    width: 220,
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    shadowColor: C.deepRose,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  tipCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIcon: { fontSize: 11, fontWeight: '700', color: C.deepRose },
  tipTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  tipTagText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  tipBody: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
  },
  lesionCard: {
    marginHorizontal: 20,
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: C.deepRose,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 8,
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blush,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  scanIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.deepRose,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  scanIcon: { fontSize: 11, fontWeight: '700', color: C.deepRose },
  scanBody: { flex: 1 },
  scanTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: C.text,
    marginBottom: 3,
  },
  scanSub: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 16,
  },
  scanArrow: {
    fontSize: 24,
    color: C.deepRose,
    fontWeight: '300',
  },
  lesionDivider: {
    height: 1,
    backgroundColor: C.sand,
    marginVertical: 16,
  },
  lesionListTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: C.muted,
    marginBottom: 14,
  },
  lesionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  lesionThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lesionThumbIcon: { fontSize: 11, fontWeight: '700', color: C.deepRose },
  lesionContent: { flex: 1 },
  lesionRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  lesionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  lesionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  lesionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  lesionDate: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 3,
  },
  lesionNote: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 17,
  },
  disclaimerWrap: {
    marginTop: 4,
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.warn,
  },
  disclaimerText: {
    fontSize: 11,
    color: C.warn,
    lineHeight: 16,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,144,154,0.18)',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  navIcon: {
    fontSize: 12,
    color: C.deepRose,
    fontWeight: '700',
  },
  navLabel: {
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.5,
  },
  navLabelActive: {
    color: C.deepRose,
    fontWeight: '500',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.rose,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: C.deepRose,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 20,
    color: C.white,
  },
  bottomSpacer: { height: 24 },
});
