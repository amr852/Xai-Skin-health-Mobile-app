import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Sun } from 'lucide-react-native';

import { C, FontFamily, FontSize, Overlay, Radius, Shadow, Space } from '@/constants/theme';
import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';
import { VitalRingCard } from '@/components/vitals/VitalRingCard';
import { SunProtectionCard } from '@/components/home/SunProtectionCard';
import { MonitorLesionsSection } from '@/components/home/MonitorLesionsSection';
import { GradientHero } from '@/components/decor/GradientHero';
import { GridBackplate } from '@/components/decor/GridBackplate';
import { Petal } from '@/components/decor/Petal';

import { useAuth } from '@/hooks/useAuth';
import { useHomeVitals } from '@/hooks/useHomeVitals';
import { useUvIndex } from '@/hooks/useUvIndex';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import {
  WATER_TARGET_L, SLEEP_TARGET_H, vitalsStatusFromTargetPct,
  formatWaterValue, formatSleepValue,
} from '@/components/vitals/vitalsFormat';
import { countUnread, subscribeInboxChange } from '@/lib/notificationInbox';
import { syncWaterInboxItems } from '@/lib/notificationScheduler';
import { useUiOverlay } from '@/context/UiOverlayContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { openAvatarMenu } = useUiOverlay();
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [unreadCount, setUnreadCount] = useState(0);
  const {
    waterLiters, sleepHours,
    addWater, resetWater, addSleep, resetSleep,
  } = useHomeVitals();

  const waterPct = Math.min(100, Math.round((waterLiters / WATER_TARGET_L) * 100));
  const sleepPct = Math.min(100, Math.round((sleepHours / SLEEP_TARGET_H) * 100));
  const waterStatus = waterLiters >= WATER_TARGET_L ? 'Hydrated' : vitalsStatusFromTargetPct(waterPct);
  const sleepStatus = sleepHours >= SLEEP_TARGET_H ? 'Rested'   : vitalsStatusFromTargetPct(sleepPct);

  const { uvi, loading, error, permissionDenied, subtitle, refresh } = useUvIndex();
  const [uvRefreshing, setUvRefreshing] = useState(false);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'SH';
  const userName = user?.firstName || 'there';

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
    : error             ? { label: 'Unavailable',  color: C.textHint }
    : loading           ? { label: 'Loading…',      color: C.textHint }
    :                     { label: '—',             color: C.textHint };

  const handleNav = (key: NavKey) => {
    if      (key === 'scan')    router.push('/camera');
    else if (key === 'history') router.push('/history');
    else if (key === 'profile') router.push('/profile');
    else setActiveNav(key);
  };

  const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen
      header={
        <PageHeader
          initials={initials}
          name={user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'User'}
          unreadCount={unreadCount}
          onBellPress={() => router.push('/notifications')}
          onAvatarPress={openAvatarMenu}
        />
      }
      tabBar={<BottomTabBar active={activeNav} onPress={handleNav} />}
      refreshControl={<RefreshControl refreshing={uvRefreshing} onRefresh={onUvRefresh} tintColor={C.primary} />}
      scrollProps={{ contentContainerStyle: { paddingHorizontal: 0 } }}>

      {/* ── Gradient greeting strip — bento element 1 ────────────────── */}
      <View style={s.greetingWrap}>
        <GradientHero style={s.gradient}>
          {/* Two diagonal petal hints — decorative; hidden from screen readers. */}
          <View
            style={s.greetingPetalTR}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <Petal size={150} color={Overlay.whiteMuted} opacity={0.32} />
          </View>
          <View
            style={s.greetingPetalBL}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <Petal size={110} color={Overlay.whiteMuted} opacity={0.22} />
          </View>
          <View style={s.gradientInner}>
            <View style={s.gradientHeader}>
              <Text style={s.gradientDate}>{todayStr.toUpperCase()}</Text>
              {/* Insight chip — premium feel + a glance at today's skin status */}
              <View style={s.insightChip}>
                <View style={s.insightDot} />
                <Text style={s.insightTxt}>SKIN OK</Text>
              </View>
            </View>
            <Text style={s.gradientHello}>Hello, {userName}.</Text>
            <Text style={s.gradientLine}>
              <Text style={s.gradientLineEm}>Today</Text>
              {' — '}your snapshot for hydration, UV, and lesion tracking.
            </Text>
          </View>
        </GradientHero>
      </View>

      {/* ── UV bento tile (full width) ───────────────────────────────── */}
      <View style={s.bentoBlock}>
        <View style={s.uvCard}>
          <View
            pointerEvents="none"
            style={s.uvGridBackplate}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <GridBackplate width={320} height={140} pitch={28} opacity={0.25} />
          </View>
          <View style={s.uvHead}>
            <View style={s.uvIconBg}>
              <Sun size={20} color={C.primary} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.uvLabel}>UV INDEX</Text>
              <Text style={s.uvLabelSub}>Solar exposure · {subtitle}</Text>
            </View>
            <View style={[s.uvRiskPill, { backgroundColor: uvRisk.color + '1A' }]}>
              <View style={[s.uvDot, { backgroundColor: uvRisk.color }]} />
              <Text style={[s.uvRiskTxt, { color: uvRisk.color }]}>{uvRisk.label}</Text>
            </View>
          </View>
          <View style={s.uvBody}>
            <View style={s.uvValueRow}>
              {uvDisplay == null ? (
                <ActivityIndicator size="large" color={C.primary} />
              ) : (
                <Text style={s.uvValue}>{uvDisplay}</Text>
              )}
              <Text style={s.uvUnit}>UVI</Text>
            </View>
            <View style={s.uvGauge}>
              {[1, 2, 3, 4, 5].map(i => {
                // Clamp UV index to [0, 11+] before deriving the lit-bar count so
                // bad data (NaN, negative, runaway values) never paints a broken gauge.
                const safeUvi = uvi != null && Number.isFinite(uvi)
                  ? Math.max(0, Math.min(uvi, 11))
                  : null;
                const litBars = safeUvi != null
                  ? Math.max(0, Math.min(5, Math.ceil(safeUvi / 2.2)))
                  : 0;
                const isActive = i <= litBars;
                const heights = [16, 22, 28, 22, 16];
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

      {/* ── Daily habits — small tracked label, hairline above ────────── */}
      <View style={s.sectionMargin}>
        <SectionHeader title="Daily Habits" tracked />
      </View>

      <SunProtectionCard />

      {/* ── Vitals row ─────────────────────────────────────────────────── */}
      <View style={s.vitalsGrid}>
        {(() => {
          const water = formatWaterValue(waterLiters);
          const sleep = formatSleepValue(sleepHours);
          return (
            <>
              <VitalRingCard
                icon="droplet"
                label="Hydration"
                value={water.value}
                unit={water.unit}
                status={waterStatus}
                accent={C.primary}
                accentSoft={C.primaryLight}
                fillPct={waterPct}
                targetText={`of ${WATER_TARGET_L} L goal`}
                onReset={resetWater}
                chips={[
                  { label: '+250 ml', onPress: () => addWater(0.25) },
                  { label: '+500 ml', onPress: () => addWater(0.5) },
                  { label: '+1 L',    onPress: () => addWater(1) },
                ]}
              />
              <VitalRingCard
                icon="moon"
                label="Sleep"
                value={sleep.value}
                unit={sleep.unit}
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
            </>
          );
        })()}
      </View>

      <MonitorLesionsSection />

      <View style={{ height: 8 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  // ── Gradient greeting ──────────────────────────────────────
  greetingWrap: {
    paddingHorizontal: Space[5],
    marginTop: Space[1],
    marginBottom: Space[4],
  },
  gradient: {
    borderRadius: Radius.xl + 2, // 22 — slight nudge over xl(20) keeps the hero distinctive
    minHeight: 116,
    ...Shadow.sm,
  },
  greetingPetalTR: {
    position: 'absolute',
    top: -42, right: -42,
  },
  greetingPetalBL: {
    position: 'absolute',
    bottom: -34, left: -34,
  },
  gradientInner: {
    paddingHorizontal: Space[5],
    paddingVertical: Space[4] + 2,
  },
  gradientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  // "Skin OK" pill — small premium status chip on the gradient hero
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Overlay.whiteFaint,
    borderWidth: 1,
    borderColor: Overlay.whiteSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  insightDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#9EE6B0', // soft mint — distinct from medical green; brand glow
  },
  insightTxt: {
    fontSize: FontSize.xs - 1.5, // 9.5 — sub-caption, kept as-is for chip density
    fontFamily: FontFamily.bodyBold,
    color: Overlay.whiteAlmost,
    letterSpacing: 1.2,
  },
  gradientDate: {
    fontSize: FontSize.xs - 1, // 10
    fontFamily: FontFamily.bodyBold,
    color: Overlay.whiteHigh,
    letterSpacing: 1.4,
  },
  gradientHello: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.bodyBold,
    color: C.surface,
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  gradientLine: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: Overlay.whiteHigh,
  },
  gradientLineEm: {
    fontFamily: FontFamily.bodyBold,
    color: Overlay.whiteAlmost,
  },

  // ── UV bento tile ──────────────────────────────────────────
  bentoBlock: {
    paddingHorizontal: Space[5],
    marginBottom: Space[4],
  },
  uvCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.xl + 2, // 22 — matches greeting hero for visual cohesion
    borderWidth: 1,
    borderColor: C.border,
    padding: Space[4] + 2, // 18 — slight breathing room over Space[4] for the larger UV value
    overflow: 'hidden',
    ...Shadow.xs,
  },
  uvGridBackplate: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  uvHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  uvIconBg: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  uvLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    letterSpacing: 1.2,
  },
  uvLabelSub: {
    fontSize: 11.5,
    fontFamily: FontFamily.body,
    color: C.textSub,
    marginTop: 1,
  },
  uvRiskPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9999,
  },
  uvDot: { width: 6, height: 6, borderRadius: 3 },
  uvRiskTxt: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.2,
  },
  uvBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  uvValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  uvValue: {
    fontSize: 56,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: -2,
    lineHeight: 60,
    fontVariant: ['tabular-nums'],
  },
  uvUnit: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemibold,
    color: C.textSub,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  uvGauge: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', paddingBottom: 4 },
  uvGaugeBar: { width: 8, borderRadius: 4 },

  // ── Sections ───────────────────────────────────────────────
  sectionMargin: { marginTop: 4 },
  vitalsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Space[5],
    marginBottom: Space[5],
    gap: Space[3],
  },
});
