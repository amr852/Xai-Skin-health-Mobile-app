import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';
import { VitalCard } from '@/components/vitals/VitalCard';
import { useHomeVitals } from '@/hooks/useHomeVitals';
import { useUvIndex } from '@/hooks/useUvIndex';
import { uviToDisplay, uviToRiskMeta } from '@/lib/uvIndexMeta';
import { MonitorLesionsSection } from '@/components/home/MonitorLesionsSection';
import { useRouter, useFocusEffect } from 'expo-router';
import { countUnread,subscribeInboxChange } from '@/lib/notificationInbox';
import { useAuth } from '@/hooks/useAuth';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type NavKey = 'home' | 'scan' | 'history' | 'profile';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [unreadCount, setUnreadCount] = useState(0);
  const { vitals } = useHomeVitals();
  const { uvi, loading, error, permissionDenied, subtitle, refresh } = useUvIndex();
  const [uvRefreshing, setUvRefreshing] = useState(false);

  // Get user initials
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0]?.toUpperCase() || '';
    const last = lastName?.[0]?.toUpperCase() || '';
    return (first + last) || 'SH';
  };

  const userInitials = getInitials(user?.firstName, user?.lastName);
  const userName = user?.firstName || 'User';

  const onUvRefresh = useCallback(async () => {
    setUvRefreshing(true);
    try {
      await refresh();
    } finally {
      setUvRefreshing(false);
    }
  }, [refresh]);

  useFocusEffect(
  useCallback(() => {
    let alive = true;
    const upd = async () => {
      const count = await countUnread();  // ← no argument, awaited
      if (alive) setUnreadCount(count);
    };
    void upd();
    const unsub = subscribeInboxChange(() => void upd());
    return () => {
      alive = false;
      unsub();
    };
  }, []),
);

  const uvDisplay = loading && uvi == null ? null : uviToDisplay(uvi ?? NaN);
  const uvRisk =
    uvi != null
      ? uviToRiskMeta(uvi)
      : permissionDenied
        ? { label: 'Location off', color: C.muted }
        : error
          ? { label: 'Unavailable', color: C.muted }
          : loading
            ? { label: 'Loading…', color: C.muted }
            : { label: '—', color: C.muted };

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home', icon: 'home', a11y: 'Home' },
    { key: 'scan', icon: 'camera', a11y: 'Camera' },
    { key: 'history', icon: 'clock', a11y: 'History' },
    { key: 'profile', icon: 'user', a11y: 'Profile' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 88 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={uvRefreshing} onRefresh={onUvRefresh} tintColor={C.amber} />
        }>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{userInitials}</Text>
            </View>
            <Text style={s.helloTxt}>Hello, {userName}!</Text>
          </View>
          <TouchableOpacity
            style={s.bell}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Notifications">
            <Feather name="bell" size={22} color={C.text} />
            {unreadCount > 0 ? <View style={s.bellDot} /> : null}
          </TouchableOpacity>
        </View>

        <View style={s.greetWrap}>
          <Text style={s.greetHead}>Skin Lesions Tracker</Text>
        </View>

        <View style={s.uvHeroCard}>
          <View style={s.uvHeroLeft}>
            <View style={s.uvHeroIconWrap}>
              <Feather name="sun" size={18} color={C.amber} />
            </View>
            <Text style={s.uvHeroTitle}>UV index</Text>
            <Text style={s.uvHeroSub}>{subtitle}</Text>
            <View style={s.uvHeroStatusRow}>
              <View style={[s.vStatusDot, { backgroundColor: uvRisk.color }]} />
              <Text style={[s.uvHeroStatus, { color: uvRisk.color }]}>{uvRisk.label}</Text>
            </View>
          </View>
          <View style={s.uvHeroBigBox}>
            {uvDisplay == null ? (
              <ActivityIndicator size="small" color={C.amber} />
            ) : (
              <Text style={s.uvHeroBigNum}>{uvDisplay}</Text>
            )}
            <Text style={s.uvHeroBigUnit}>UVI</Text>
          </View>
        </View>

        <View style={s.secHead}>
          <View style={s.secHeadText}>
            <Text style={s.secTitle}>Daily necessities</Text>
            <Text style={s.secDesc}>
              Hydration and rest help your skin repair and stay resilient.
            </Text>
          </View>
        </View>
        <View style={s.vitalsGrid}>
          {vitals.map((v, i) => (
            <VitalCard key={i} {...v} />
          ))}
        </View>

        <MonitorLesionsSection />

        <View style={{ height: 24 }} />
      </ScrollView>

      <View
        style={[s.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]}
        pointerEvents="box-none">
        <View style={s.navPill}>
          {navItems.map(item => {
            const active = activeNav === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.navIconCircle, active ? s.navIconCircleActive : s.navIconCircleIdle]}
                onPress={() => {
                  if (item.key === 'scan') {
                    router.push('/camera');
                  } else if (item.key === 'history') {
                    router.push('/history');
                  } else if (item.key === 'profile') {
                    router.push('/profile');
                  } else {
                    setActiveNav(item.key);
                  }
                }}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={item.a11y}
                accessibilityState={{ selected: active }}>
                <Feather
                  name={item.icon}
                  size={21}
                  color={active ? C.navIconActive : C.navIconInactive}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.headerAvatarRing,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTxt: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2E2608',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  helloTxt: {
    fontSize: 18,
    fontWeight: '500',
    color: C.text,
    letterSpacing: -0.2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  bell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.bellBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.bellBadge,
    position: 'absolute',
    top: 7,
    right: 7,
    borderWidth: 2.5,
    borderColor: C.bg,
  },

  greetWrap: { paddingHorizontal: 22, marginBottom: 10 },
  greetHead: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
    lineHeight: 34,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  uvHeroCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.diagYellow,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  uvHeroLeft: { flex: 1 },
  uvHeroIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uvHeroTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  uvHeroSub: {
    fontSize: 12,
    color: C.amber,
    marginTop: 3,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  uvHeroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  vStatusDot: { width: 5, height: 5, borderRadius: 2.5 },
  uvHeroStatus: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  uvHeroBigBox: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: C.diagYellowPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192, 128, 16, 0.2)',
  },
  uvHeroBigNum: {
    fontSize: 28,
    fontWeight: '700',
    color: C.diagLine,
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  uvHeroBigUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: C.amber,
    marginTop: 2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    marginBottom: 10,
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

  vitalsGrid: {
    paddingHorizontal: 18,
    marginBottom: 14,
    gap: 10,
    width: '100%',
    alignSelf: 'stretch',
  },

  navOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: C.navPillBg,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : Platform.OS === 'android'
        ? { elevation: 6 }
        : { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }),
  },
  navIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconCircleIdle: {
    backgroundColor: C.navCircleInactive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  navIconCircleActive: {
    backgroundColor: C.navCircleActive,
    borderColor: C.navCircleActive,
  },
});
