import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, RefreshControl, ActivityIndicator,
  Modal, Pressable,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';
import { VitalRingCard } from '@/components/vitals/VitalRingCard';
import { useHomeVitals } from '@/hooks/useHomeVitals';
import { SunProtectionCard } from '@/components/home/SunProtectionCard';
import { WATER_TARGET_L, SLEEP_TARGET_H, vitalsStatusFromTargetPct } from '@/components/vitals/vitalsFormat';
import { useUvIndex } from '@/hooks/useUvIndex';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import { MonitorLesionsSection } from '@/components/home/MonitorLesionsSection';
import { GentleNudge } from '@/components/home/GentleNudge';
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
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const {
    waterLiters, sleepHours,
    addWater, resetWater, addSleep, resetSleep,
  } = useHomeVitals();

  const waterPct = Math.min(100, Math.round((waterLiters / WATER_TARGET_L) * 100));
  const sleepPct = Math.min(100, Math.round((sleepHours / SLEEP_TARGET_H) * 100));
  const waterStatus = waterLiters >= WATER_TARGET_L
    ? 'Hydrated'
    : vitalsStatusFromTargetPct(waterPct);
  const sleepStatus = sleepHours >= SLEEP_TARGET_H
    ? 'Rested'
    : vitalsStatusFromTargetPct(sleepPct);
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
          onAvatarPress={() => setShowAvatarMenu(true)}
        />

        {/* Today strip */}
        <View style={s.todayStrip}>
          <View style={s.todayLeft}>
            <View style={s.todayDatePill}>
              <Feather name="calendar" size={11} color={C.primary} />
              <Text style={s.todayDateTxt}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
            </View>
            <Text style={s.todayHeadline}>Take care of your skin today.</Text>
          </View>
          <View style={s.todayOrb}>
            <View style={s.todayOrbInner}>
              <Feather name="smile" size={16} color={C.primary} />
            </View>
          </View>
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

        {/* Daily habits */}
        <SectionHeader
          title="Daily Habits"
          subtitle="Protect, hydrate, and rest to support skin resilience"
        />

        {/* Gentle inline nudge — only after noon if still under half the water goal */}
        <GentleNudge
          visible={new Date().getHours() >= 12 && waterLiters < WATER_TARGET_L / 2}
          icon="droplet"
          tone="info"
          message={`You're ${(WATER_TARGET_L - waterLiters).toFixed(1)} L short of today's hydration goal.`}
          actionLabel="+250ml"
          onAction={() => addWater(0.25)}
        />

        <SunProtectionCard />

        <View style={s.vitalsGrid}>
          <VitalRingCard
            icon="droplet"
            label="Hydration"
            value={waterLiters.toFixed(1)}
            unit="L"
            status={waterStatus}
            accent={C.primary}
            accentSoft={C.primaryLight}
            fillPct={waterPct}
            targetText={`of ${WATER_TARGET_L} L goal`}
            onReset={resetWater}
            chips={[
              { label: '+250ml', onPress: () => addWater(0.25) },
              { label: '+500ml', onPress: () => addWater(0.5) },
              { label: '+1L',    onPress: () => addWater(1) },
            ]}
          />
          <VitalRingCard
            icon="moon"
            label="Sleep"
            value={String(sleepHours)}
            unit="h"
            status={sleepStatus}
            accent={C.purple}
            accentSoft={C.purpleLight}
            fillPct={sleepPct}
            targetText={`of ${SLEEP_TARGET_H}h goal`}
            onReset={resetSleep}
            chips={[
              { label: '+15m', onPress: () => addSleep(0.25) },
              { label: '+30m', onPress: () => addSleep(0.5) },
              { label: '+1h',  onPress: () => addSleep(1) },
            ]}
          />
        </View>

        {/* Monitor lesions */}
        <MonitorLesionsSection />

        <View style={{ height: 8 }} />
      </ScrollView>

      <BottomTabBar active={activeNav} onPress={handleNav} />

      {/* ── Avatar context menu ────────────────────────────────── */}
      <Modal
        visible={showAvatarMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarMenu(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setShowAvatarMenu(false)}>
          <Pressable style={s.menuSheet} onPress={() => {}}>
            {/* User badge */}
            <View style={s.menuUserRow}>
              <View style={s.menuAvatar}>
                <Text style={s.menuAvatarTxt}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuUserName}>{userName}</Text>
                <Text style={s.menuUserSub}>Registered patient</Text>
              </View>
            </View>
            <View style={s.menuDivider} />

            {/* Menu items */}
            {[
              { icon: 'user' as const,     label: 'My Profile',     onPress: () => { setShowAvatarMenu(false); router.push('/profile'); } },
              { icon: 'bell' as const,     label: 'Notifications',  onPress: () => { setShowAvatarMenu(false); router.push('/notifications'); } },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={s.menuItem}
                activeOpacity={0.7}
                onPress={item.onPress}>
                <View style={s.menuItemIcon}>
                  <Feather name={item.icon} size={17} color={C.primary} />
                </View>
                <Text style={s.menuItemTxt}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={C.textHint} />
              </TouchableOpacity>
            ))}

            <View style={s.menuDivider} />

            {/* Log out */}
            <TouchableOpacity
              style={s.menuItem}
              activeOpacity={0.7}
              onPress={async () => {
                setShowAvatarMenu(false);
                await logout();
                router.replace('/(auth)/welcome');
              }}>
              <View style={[s.menuItemIcon, { backgroundColor: C.urgentBg }]}>
                <Feather name="log-out" size={17} color={C.urgentText} />
              </View>
              <Text style={[s.menuItemTxt, { color: C.urgentText }]}>Log Out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  todayStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.primaryLight,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderLight,
    gap: 12,
    overflow: 'hidden',
  },
  todayLeft: { flex: 1, minWidth: 0 },
  todayDatePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  todayDateTxt: {
    fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 0.3,
  },
  todayHeadline: {
    fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3,
    lineHeight: 22,
  },
  todayOrb: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  todayOrbInner: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },

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

  vitalsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },

  // ── Avatar context menu modal ─────────────────────────────────
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8, paddingBottom: 32,
    paddingHorizontal: 20,
    borderWidth: 1, borderColor: C.border,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 }
      : Platform.OS === 'android' ? { elevation: 12 } : {}),
  },
  menuUserRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16,
  },
  menuAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  menuAvatarTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  menuUserName: { fontSize: 15, fontWeight: '700', color: C.text },
  menuUserSub: { fontSize: 12, color: C.textHint, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13,
  },
  menuItemIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
});
