import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';

interface LesionHistoryEntry {
  id: string;
  label: string;
  description: string;
  location: string;
  dateAdded: string;
  status: 'stable' | 'check' | 'urgent';
  image?: string;
}

type NavKey = 'home' | 'scan' | 'history' | 'profile';

const statusMeta: Record<LesionHistoryEntry['status'], { label: string; color: string; bg: string }> = {
  stable: { label: 'Stable', color: C.stableText, bg: C.stableBg },
  check: { label: 'Check', color: C.checkText, bg: C.checkBg },
  urgent: { label: 'Urgent', color: C.urgentText, bg: C.urgentBg },
};

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

function LesionCard({ item }: { item: LesionHistoryEntry }) {
  const meta = statusMeta[item.status];
  return (
    <View style={hs.lesionCard}>
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/100' }}
        style={hs.lesionImage}
      />
      <View style={hs.lesionContent}>
        <View style={hs.cardTop}>
          <View style={hs.labelSection}>
            <Text style={hs.lesionLabel}>{item.label}</Text>
            <View style={[hs.statusBadge, { backgroundColor: meta.bg }]}>
              <Text style={[hs.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        </View>

        <Text style={hs.lesionDescription}>{item.description}</Text>

        <View style={hs.metaRow}>
          <View style={hs.metaItem}>
            <Feather name="map-pin" size={14} color={C.muted} />
            <Text style={hs.metaText}>{item.location}</Text>
          </View>
        </View>

        <View style={hs.metaRow}>
          <View style={hs.metaItem}>
            <Feather name="calendar" size={14} color={C.muted} />
            <Text style={hs.metaText}>{item.dateAdded}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeNav, setActiveNav] = useState<NavKey>('history');
  const [statusFilter, setStatusFilter] = useState<'all' | 'stable' | 'check' | 'urgent'>('all');

  const lesions = useMemo<LesionHistoryEntry[]>(
    () => [
      {
        id: '1',
        label: 'Mole · left forearm',
        description: 'No change in size or colour. Edges remain well-defined.',
        location: 'Left forearm',
        dateAdded: 'Added 12 Mar 2025',
        status: 'stable',
        image: 'https://via.placeholder.com/100?text=Mole',
      },
      {
        id: '2',
        label: 'Patch · right shoulder',
        description: 'Slight edge irregularity detected. Schedule a follow-up review soon.',
        location: 'Right shoulder',
        dateAdded: 'Added 28 Mar 2025',
        status: 'check',
        image: 'https://via.placeholder.com/100?text=Patch',
      },
      {
        id: '3',
        label: 'Spot · upper back',
        description: 'Rapid change vs last scan — see a dermatologist as soon as possible.',
        location: 'Upper back',
        dateAdded: 'Added 29 Mar 2025',
        status: 'urgent',
        image: 'https://via.placeholder.com/100?text=Spot',
      },
      {
        id: '4',
        label: 'Freckle · chest',
        description: 'Stable appearance with no significant changes observed.',
        location: 'Chest',
        dateAdded: 'Added 15 Feb 2025',
        status: 'stable',
        image: 'https://via.placeholder.com/100?text=Freckle',
      },
    ],
    [],
  );

  const sortedAndFilteredLesions = useMemo(() => {
    let filtered = lesions;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dateAdded.replace('Added ', ''));
      const dateB = new Date(b.dateAdded.replace('Added ', ''));
      return dateB.getTime() - dateA.getTime();
    });
  }, [lesions, statusFilter]);

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home', icon: 'home', a11y: 'Home' },
    { key: 'scan', icon: 'camera', a11y: 'Camera' },
    { key: 'history', icon: 'clock', a11y: 'History' },
    { key: 'profile', icon: 'user', a11y: 'Profile' },
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
              <Text style={hs.avatarTxt}>LH</Text>
            </View>
            <Text style={hs.helloTxt}>Hello, Layla!</Text>
          </View>
          <TouchableOpacity
            style={hs.bell}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Notifications">
            <Feather name="bell" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        <View style={hs.header}>
          <Text style={hs.headerTitle}>Lesion History</Text>
          <Text style={hs.headerSubtitle}>Track all your logged lesions and their status</Text>
        </View>

        <View style={hs.statsSection}>
          <View style={hs.statItem}>
            <Text style={hs.statNumber}>{lesions.length}</Text>
            <Text style={hs.statLabel}>Total</Text>
          </View>
          <View style={hs.statItem}>
            <Text style={[hs.statNumber, { color: C.stableText }]}>
              {lesions.filter(l => l.status === 'stable').length}
            </Text>
            <Text style={hs.statLabel}>Stable</Text>
          </View>
          <View style={hs.statItem}>
            <Text style={[hs.statNumber, { color: C.checkText }]}>
              {lesions.filter(l => l.status === 'check').length}
            </Text>
            <Text style={hs.statLabel}>Check</Text>
          </View>
          <View style={hs.statItem}>
            <Text style={[hs.statNumber, { color: C.urgentText }]}>
              {lesions.filter(l => l.status === 'urgent').length}
            </Text>
            <Text style={hs.statLabel}>Urgent</Text>
          </View>
        </View>

        <View style={hs.filterSection}>
          <TouchableOpacity
            style={[
              hs.filterButton,
              statusFilter === 'all' && hs.filterButtonActive,
              { backgroundColor: statusFilter === 'all' ? C.blue : 'transparent' },
            ]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}>
            <Text
              style={[
                hs.filterButtonText,
                statusFilter === 'all' && hs.filterButtonTextActive,
                { color: statusFilter === 'all' ? C.white : C.text },
              ]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              hs.filterButton,
              statusFilter === 'stable' && hs.filterButtonActive,
              { backgroundColor: statusFilter === 'stable' ? C.stableBg : 'transparent' },
            ]}
            onPress={() => setStatusFilter('stable')}
            activeOpacity={0.7}>
            <Text
              style={[
                hs.filterButtonText,
                statusFilter === 'stable' && hs.filterButtonTextActive,
                { color: statusFilter === 'stable' ? C.stableText : C.text },
              ]}>
              Stable
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              hs.filterButton,
              statusFilter === 'check' && hs.filterButtonActive,
              { backgroundColor: statusFilter === 'check' ? C.checkBg : 'transparent' },
            ]}
            onPress={() => setStatusFilter('check')}
            activeOpacity={0.7}>
            <Text
              style={[
                hs.filterButtonText,
                statusFilter === 'check' && hs.filterButtonTextActive,
                { color: statusFilter === 'check' ? C.checkText : C.text },
              ]}>
              Check
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              hs.filterButton,
              statusFilter === 'urgent' && hs.filterButtonActive,
              { backgroundColor: statusFilter === 'urgent' ? C.urgentBg : 'transparent' },
            ]}
            onPress={() => setStatusFilter('urgent')}
            activeOpacity={0.7}>
            <Text
              style={[
                hs.filterButtonText,
                statusFilter === 'urgent' && hs.filterButtonTextActive,
                { color: statusFilter === 'urgent' ? C.urgentText : C.text },
              ]}>
              Urgent
            </Text>
          </TouchableOpacity>
        </View>

        {sortedAndFilteredLesions.length > 0 ? (
          sortedAndFilteredLesions.map(lesion => (
            <LesionCard key={lesion.id} item={lesion} />
          ))
        ) : (
          <View style={hs.emptyState}>
            <Feather name="inbox" size={48} color={C.muted} />
            <Text style={hs.emptyStateTitle}>No lesions found</Text>
            <Text style={hs.emptyStateText}>
              {statusFilter === 'all'
                ? 'Start scanning to add your first lesion.'
                : `No ${statusFilter} lesions yet.`}
            </Text>
          </View>
        )}

        {sortedAndFilteredLesions.length > 0 && (
          <View style={hs.disclaimer}>
            <Feather name="alert-circle" size={16} color={C.amber} />
            <Text style={hs.disclaimerText}>
              For tracking only. Always consult a dermatologist for medical advice.
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[hs.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]}
        pointerEvents="box-none">
        <View style={hs.navPill}>
          {navItems.map(item => {
            const active = activeNav === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[hs.navIconCircle, active ? hs.navIconCircleActive : hs.navIconCircleIdle]}
                onPress={() => {
                  if (item.key === 'scan') {
                    router.push('/camera');
                  } else if (item.key === 'home') {
                    router.push('/');
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

const hs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTop: {
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
    lineHeight: 34,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  headerSubtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 6,
    lineHeight: 20,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 18,
    marginBottom: 20,
    paddingVertical: 14,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: C.blue,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  statLabel: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderWidth: 0,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  filterButtonTextActive: {
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  emptyStateText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  lesionCard: {
    marginHorizontal: 18,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
  },
  lesionImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  lesionContent: {
    flex: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  labelSection: {
    flex: 1,
  },
  lesionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  lesionDescription: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 8,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  disclaimer: {
    marginHorizontal: 18,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF8E6',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.amber,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#8B6914',
    flex: 1,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
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
