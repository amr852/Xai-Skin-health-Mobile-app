import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';
import { VitalCard } from '@/components/vitals/VitalCard';
import { useHomeVitals } from '@/hooks/useHomeVitals';
import { useUvIndex } from '@/hooks/useUvIndex';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import { MonitorLesionsSection } from '@/components/home/MonitorLesionsSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';
import { useRouter, useFocusEffect } from 'expo-router';
import { countUnread, subscribeInboxChange } from '@/lib/notificationInbox';
import { syncWaterInboxItems } from '@/lib/notificationScheduler';
import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [unreadCount, setUnreadCount] = useState(0);
  const { vitals } = useHomeVitals();
  const { uvi, loading, error, permissionDenied, subtitle, refresh } = useUvIndex();
  const [uvRefreshing, setUvRefreshing] = useState(false);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'SH';
  const userName  = user?.firstName || 'User';

  const onUvRefresh = useCallback(async () => {
    setUvRefreshing(true);
    try { await refresh(); } finally { setUvRefreshing(false); }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const upd = async () => {
        const count = await countUnread();
        if (alive) setUnreadCount(count);
      };
      void syncWaterInboxItems();
      void upd();
      const unsub = subscribeInboxChange(() => void upd());
      return () => { alive = false; unsub(); };
    }, []),
  );

  const uvDisplay = loading && uvi == null ? null : uviToDisplay(uvi ?? NaN);
  const uvRisk = uvi != null
    ? uviToRiskMeta(uvi)
    : permissionDenied ? { label: 'Location off',  color: C.textHint }
    : error             ? { label: 'Unavailable',   color: C.textHint }
    : loading           ? { label: 'Loading…',      color: C.textHint }
    :                     { label: '—',             color: C.textHint };

  const TAB_HEIGHT = 60 + insets.bottom;

  const handleNav = (key: NavKey) => {
    if      (key === 'scan')    router.push('/camera');
    else if (key === 'history') router.push('/history');
    else if (key === 'profile') router.push('/profile');
    else setActiveNav(key);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: TAB_HEIGHT + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={uvRefreshing} onRefresh={onUvRefresh} tintColor={C.primary} />
        }>

        {/* Page header */}
        <PageHeader
          initials={initials}
          name={userName}
          unreadCount={unreadCount}
          onBellPress={() => router.push('/notifications')}
        />

        {/* Page title */}
        <View style={s.pageTitleBlock}>
          <View style={s.pageTitleRow}>
            <View style={s.pageTitleIcon}>
              <Feather name="heart" size={14} color={C.primary} />
            </View>
            <Text style={s.pageTitle}>Skin Dashboard</Text>
          </View>
          <Text style={s.pageSub}>Your daily dermatology health overview</Text>
        </View>

        {/* UV index card */}
        <View style={s.uvCard}>
          {/* Left medical accent bar */}
          <View style={s.uvAccentBar} />

          <View style={s.uvInner}>
            <View style={s.uvTop}>
              <View style={s.uvIconRow}>
                <View style={s.uvIconBg}>
                  <Feather name="sun" size={16} color={C.primary} />
                </View>
                <View>
                  <Text style={s.uvLabel}>UV INDEX</Text>
                  <Text style={s.uvLabelSub}>Solar exposure reading</Text>
                </View>
              </View>
              <View style={[s.uvRiskPill, { backgroundColor: uvRisk.color + '22' }]}>
                <View style={[s.uvDot, { backgroundColor: uvRisk.color }]} />
                <Text style={[s.uvRiskTxt, { color: uvRisk.color }]}>{uvRisk.label}</Text>
              </View>
            </View>
            <View style={s.uvBody}>
              <View>
                <View style={s.uvValueRow}>
                  {uvDisplay == null ? (
                    <ActivityIndicator size="large" color={C.primary} />
                  ) : (
                    <Text style={s.uvValue}>{uvDisplay}</Text>
                  )}
                  <Text style={s.uvUnit}>UVI</Text>
                </View>
                <Text style={s.uvSubtitle}>{subtitle}</Text>
              </View>
              {/* Graduated gauge bars — taller toward active level */}
              <View style={s.uvGauge}>
                {[1,2,3,4,5].map(i => {
                  const isActive = uvi != null && i <= Math.ceil(uvi / 2.2);
                  const heights = [18, 22, 28, 22, 18];
                  return (
                    <View
                      key={i}
                      style={[
                        s.uvGaugeBar,
                        { height: heights[i - 1] },
                        isActive
                          ? { backgroundColor: C.primary }
                          : { backgroundColor: C.border },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Health metrics */}
        <SectionHeader
          title="Health Metrics"
          subtitle="Track hydration, sleep, and UV exposure"
        />
        <View style={s.vitalsGrid}>
          {vitals.map((v, i) => (
            <VitalCard key={i} {...v} />
          ))}
        </View>

        {/* Monitor lesions */}
        <MonitorLesionsSection />

        <View style={{ height: 8 }} />
      </ScrollView>

      <BottomTabBar active={activeNav} onPress={handleNav} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  pageTitleBlock: {
    paddingHorizontal: 20,
    paddingTop: 4, paddingBottom: 16,
  },
  pageTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3,
  },
  pageTitleIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5,
  },
  pageSub: { fontSize: 13, color: C.textHint, marginTop: 0 },

  // ── UV Card ──────────────────────────────────────────────────────
  uvCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row',
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#1E1010', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 }
      : Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  // Left colored accent bar — medical record style
  uvAccentBar: {
    width: 4,
    backgroundColor: C.primary,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  uvInner: { flex: 1, padding: 18 },
  uvTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 14,
  },
  uvIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  uvIconBg: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  uvLabel: {
    fontSize: 12, fontWeight: '700', color: C.primary, letterSpacing: 0.8,
  },
  uvLabelSub: {
    fontSize: 10, color: C.textHint, marginTop: 2, fontWeight: '400',
  },
  uvRiskPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999,
  },
  uvDot: { width: 6, height: 6, borderRadius: 3 },
  uvRiskTxt: { fontSize: 12, fontWeight: '700' },

  uvBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  uvValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  uvValue: {
    fontSize: 52, fontWeight: '800', color: C.text, letterSpacing: -2,
    lineHeight: 56,
  },
  uvUnit: { fontSize: 16, fontWeight: '700', color: C.textHint, paddingBottom: 6 },
  uvSubtitle: { fontSize: 12, color: C.textHint, lineHeight: 17, maxWidth: 180 },
  uvGauge: { flexDirection: 'row', gap: 5, alignItems: 'flex-end', paddingBottom: 6 },
  uvGaugeBar: { width: 10, borderRadius: 4 },

  vitalsGrid: { paddingHorizontal: 20, marginBottom: 20, gap: 12 },
});
