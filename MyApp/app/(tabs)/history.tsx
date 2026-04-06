import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Platform, Image, ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { C } from '@/constants/theme';
import { useLesions, type Lesion } from '@/hooks/useLesions';
import { useAuth } from '@/hooks/useAuth';

type NavKey = 'home' | 'scan' | 'history' | 'profile';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const statusMeta: Record<'Stable' | 'Check' | 'Urgent', { label: string; color: string; bg: string }> = {
  Stable: { label: 'Stable', color: C.stableText, bg: C.stableBg },
  Check:  { label: 'Check',  color: C.checkText,  bg: C.checkBg  },
  Urgent: { label: 'Urgent', color: C.urgentText, bg: C.urgentBg },
};

function LesionCard({ item }: { item: Lesion }) {
  const meta = statusMeta[item.status] ?? statusMeta.Stable;
  return (
    <View style={hs.lesionCard}>
      <Image
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }}
        style={hs.lesionImage}
      />
      <View style={hs.lesionContent}>
        <View style={hs.cardTop}>
          <View style={hs.labelSection}>
            <Text style={hs.lesionLabel}>{item.title || 'Untitled'}</Text>
            <View style={[hs.statusBadge, { backgroundColor: meta.bg }]}>
              <Text style={[hs.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        </View>
        {!!item.description && (
          <Text style={hs.lesionDescription}>{item.description}</Text>
        )}
        {!!item.location && (
          <View style={hs.metaRow}>
            <View style={hs.metaItem}>
              <Feather name="map-pin" size={14} color={C.muted} />
              <Text style={hs.metaText}>{item.location}</Text>
            </View>
          </View>
        )}
        <View style={hs.metaRow}>
          <View style={hs.metaItem}>
            <Feather name="calendar" size={14} color={C.muted} />
            <Text style={hs.metaText}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lesions, loading, error, fetchLesions } = useLesions();
  const [activeNav, setActiveNav] = useState<NavKey>('history');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Stable' | 'Check' | 'Urgent'>('all');

  const userInitials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'SH';
  const userName = user?.firstName || 'User';

  useFocusEffect(
    useCallback(() => {
      void fetchLesions();
    }, [fetchLesions]),
  );

  const sortedAndFiltered = useMemo(() => {
    let filtered = statusFilter === 'all' ? lesions : lesions.filter(l => l.status === statusFilter);
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [lesions, statusFilter]);

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home',    icon: 'home',   a11y: 'Home'    },
    { key: 'scan',    icon: 'camera', a11y: 'Camera'  },
    { key: 'history', icon: 'clock',  a11y: 'History' },
    { key: 'profile', icon: 'user',   a11y: 'Profile' },
  ];

  return (
    <SafeAreaView style={hs.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        style={hs.scroll}
        contentContainerStyle={[hs.scrollContent, { paddingBottom: 88 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>

        <View style={hs.headerTop}>
          <View style={hs.headerLeft}>
            <View style={hs.avatar}>
              <Text style={hs.avatarTxt}>{userInitials}</Text>
            </View>
            <Text style={hs.helloTxt}>Hello, {userName}!</Text>
          </View>
          <TouchableOpacity style={hs.bell} onPress={() => router.push('/notifications')}
            activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Notifications">
            <Feather name="bell" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        <View style={hs.header}>
          <Text style={hs.headerTitle}>Lesion History</Text>
          <Text style={hs.headerSubtitle}>Track all your logged lesions and their status</Text>
        </View>

        <View style={hs.statsSection}>
          {(['all', 'Stable', 'Check', 'Urgent'] as const).map(key => (
            <View key={key} style={hs.statItem}>
              <Text style={[hs.statNumber, {
                color: key === 'Stable' ? C.stableText : key === 'Check' ? C.checkText : key === 'Urgent' ? C.urgentText : C.blue
              }]}>
                {key === 'all' ? lesions.length : lesions.filter(l => l.status === key).length}
              </Text>
              <Text style={hs.statLabel}>{key === 'all' ? 'Total' : key}</Text>
            </View>
          ))}
        </View>

        <View style={hs.filterSection}>
          {(['all', 'Stable', 'Check', 'Urgent'] as const).map(key => {
            const active = statusFilter === key;
            const bg = active
              ? key === 'all' ? C.blue : key === 'Stable' ? C.stableBg : key === 'Check' ? C.checkBg : C.urgentBg
              : 'transparent';
            const color = active
              ? key === 'all' ? C.white : key === 'Stable' ? C.stableText : key === 'Check' ? C.checkText : C.urgentText
              : C.text;
            return (
              <TouchableOpacity key={key}
                style={[hs.filterButton, { backgroundColor: bg }, active && hs.filterButtonActive]}
                onPress={() => setStatusFilter(key)} activeOpacity={0.7}>
                <Text style={[hs.filterButtonText, { color }]}>
                  {key === 'all' ? 'All' : key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={hs.emptyState}>
            <ActivityIndicator size="large" color={C.blue} />
            <Text style={[hs.emptyStateText, { marginTop: 12 }]}>Loading lesions…</Text>
          </View>
        ) : error ? (
          <View style={hs.emptyState}>
            <Feather name="alert-circle" size={48} color={C.urgentText} />
            <Text style={hs.emptyStateTitle}>Failed to load</Text>
            <Text style={hs.emptyStateText}>{error}</Text>
            <TouchableOpacity onPress={fetchLesions} style={hs.retryBtn}>
              <Text style={hs.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sortedAndFiltered.length > 0 ? (
          <>
            {sortedAndFiltered.map(l => <LesionCard key={l._id} item={l} />)}
            <View style={hs.disclaimer}>
              <Feather name="alert-circle" size={16} color={C.amber} />
              <Text style={hs.disclaimerText}>
                For tracking only. Always consult a dermatologist for medical advice.
              </Text>
            </View>
          </>
        ) : (
          <View style={hs.emptyState}>
            <Feather name="inbox" size={48} color={C.muted} />
            <Text style={hs.emptyStateTitle}>No lesions found</Text>
            <Text style={hs.emptyStateText}>
              {statusFilter === 'all' ? 'Start scanning to add your first lesion.' : `No ${statusFilter} lesions yet.`}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[hs.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
        <View style={hs.navPill}>
          {navItems.map(item => {
            const active = activeNav === item.key;
            return (
              <TouchableOpacity key={item.key}
                style={[hs.navIconCircle, active ? hs.navIconCircleActive : hs.navIconCircleIdle]}
                onPress={() => {
                  if (item.key === 'scan') router.push('/camera');
                  else if (item.key === 'home') router.push('/');
                  else if (item.key === 'profile') router.push('/profile');
                  else setActiveNav(item.key);
                }}
                activeOpacity={0.82} accessibilityRole="button"
                accessibilityLabel={item.a11y} accessibilityState={{ selected: active }}>
                <Feather name={item.icon} size={21} color={active ? C.navIconActive : C.navIconInactive} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const hs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 16, marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.headerAvatarRing,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarTxt: {
    fontSize: 17, fontWeight: '600', color: '#2E2608',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  helloTxt: {
    fontSize: 18, fontWeight: '500', color: C.text, letterSpacing: -0.2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  bell: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.bellBg,
    alignItems: 'center', justifyContent: 'center',
  },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6, lineHeight: 34,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  headerSubtitle: {
    fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 20,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  statsSection: {
    flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 18,
    marginBottom: 20, paddingVertical: 14, backgroundColor: C.white,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  statItem: { alignItems: 'center' },
  statNumber: {
    fontSize: 20, fontWeight: '700', color: C.blue,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  statLabel: {
    fontSize: 12, color: C.muted, marginTop: 4,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  filterSection: {
    flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12, gap: 8, marginBottom: 12,
  },
  filterButton: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  filterButtonActive: { borderWidth: 0 },
  filterButtonText: {
    fontSize: 13, fontWeight: '600', color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesionCard: {
    marginHorizontal: 18, marginBottom: 16, borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', flexDirection: 'row',
  },
  lesionImage: { width: 100, height: 100, backgroundColor: '#f0f0f0' },
  lesionContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  labelSection: { flex: 1 },
  lesionLabel: {
    fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 6,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  statusBadgeText: {
    fontSize: 11, fontWeight: '600',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesionDescription: {
    fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 8,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    fontSize: 12, color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyStateTitle: {
    fontSize: 18, fontWeight: '600', color: C.text, marginTop: 16, marginBottom: 8,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  emptyStateText: {
    fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.blue, borderRadius: 10,
  },
  retryTxt: { color: C.white, fontWeight: '600', fontSize: 14 },
  disclaimer: {
    marginHorizontal: 18, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FFF8E6', borderRadius: 12, borderLeftWidth: 4,
    borderLeftColor: C.amber, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  disclaimerText: {
    fontSize: 12, color: '#8B6914', flex: 1, lineHeight: 18,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  navOuter: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  navPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    backgroundColor: C.navPillBg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12,
    gap: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.05)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 6 }
      : { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }),
  },
  navIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  navIconCircleIdle: { backgroundColor: C.navCircleInactive, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.04)' },
  navIconCircleActive: { backgroundColor: C.navCircleActive, borderColor: C.navCircleActive },
});