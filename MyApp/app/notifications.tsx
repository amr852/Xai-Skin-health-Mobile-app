import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FontSize, Space, Radius } from '@/constants/theme';
import {
  loadInbox, markAllInboxRead, markInboxItemRead, type InboxItem,
} from '@/lib/notificationInbox';
import { syncWaterInboxItems } from '@/lib/notificationScheduler';
import { EmptyState } from '@/components/ui/EmptyState';

type NotifType = 'uv' | 'water' | 'sun' | 'lesion' | 'urgent' | 'default';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

function inferType(item: InboxItem): NotifType {
  const t = item.title?.toLowerCase() ?? '';
  const b = item.body?.toLowerCase()  ?? '';
  if (t.includes('sunscreen') || b.includes('sunscreen') || t.includes('spf') || b.includes('spf') || t.includes('reapply')) return 'sun';
  if (t.includes('uv') || b.includes('uv'))        return 'uv';
  if (t.includes('water') || b.includes('water'))   return 'water';
  if (t.includes('urgent') || b.includes('urgent')) return 'urgent';
  if (t.includes('lesion') || b.includes('lesion')) return 'lesion';
  return 'default';
}

const TYPE_META: Record<NotifType, {
  icon: FeatherIconName;
  color: string;
  bg: string;
  label: string;
}> = {
  uv:      { icon: 'sun',          color: C.amber,      bg: C.amberLight,   label: 'UV Index'    },
  sun:     { icon: 'shield',       color: C.amberFill,  bg: C.amberLight,   label: 'Sun Protection' },
  water:   { icon: 'droplet',      color: C.primary,    bg: C.primaryLight, label: 'Hydration'   },
  lesion:  { icon: 'zoom-in',      color: C.purple,     bg: C.purpleLight,  label: 'Lesion'      },
  urgent:  { icon: 'alert-circle', color: C.urgentText, bg: C.urgentBg,     label: 'Urgent'      },
  default: { icon: 'bell',         color: C.primary,    bg: C.primaryLight, label: 'Reminder'    },
};

function groupByDate(items: InboxItem[]): { label: string; data: InboxItem[] }[] {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const groups: Record<string, InboxItem[]> = {};
  for (const item of items) {
    const d = new Date(item.createdAt); d.setHours(0,0,0,0);
    let label: string;
    if (d.getTime() === today.getTime())     label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return Object.entries(groups).map(([label, data]) => ({ label, data }));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [firstLoad, setFirstLoad] = useState(true);

  const refresh = useCallback(async () => {
    await syncWaterInboxItems();
    setItems(await loadInbox());
    setFirstLoad(false);
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const onPressRow = async (id: string) => {
    await markInboxItemRead(id);
    await refresh();
  };

  const onReadAll = async () => {
    await markAllInboxRead();
    await refresh();
  };

  const unread   = items.filter(i => !i.read).length;
  const hasItems = items.length > 0;
  const groups   = groupByDate(items);

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Branded header ── */}
      <View style={st.header}>
        {/* Decorative rings */}
        <View style={st.headerRing1} />
        <View style={st.headerRing2} />

        <View style={st.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={st.backBtn}
            hitSlop={12}
            accessibilityLabel="Back">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={st.headerCenter}>
            <View style={st.headerIconBg}>
              <Feather name="bell" size={18} color={C.primary} />
            </View>
            <Text style={st.headerTitle}>Notifications</Text>
          </View>

          {hasItems ? (
            <TouchableOpacity
              onPress={unread > 0 ? onReadAll : undefined}
              disabled={unread === 0}
              hitSlop={6}
              style={st.readAllBtn}
              accessibilityLabel="Mark all read">
              <Text style={[st.readAllTxt, unread === 0 && st.readAllTxtOff]}>
                Read all
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={st.readAllBtn} />
          )}
        </View>

        {/* Unread badge row */}
        <View style={st.headerMeta}>
          {unread > 0 ? (
            <View style={st.unreadBadge}>
              <View style={st.unreadDot} />
              <Text style={st.unreadTxt}>
                {unread} unread notification{unread === 1 ? '' : 's'}
              </Text>
            </View>
          ) : hasItems ? (
            <View style={st.allReadBadge}>
              <Feather name="check-circle" size={12} color={C.stableText} />
              <Text style={st.allReadTxt}>All caught up</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}>

        {firstLoad && items.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon="bell-off"
            title="No notifications yet"
            message="Reminders for water, UV digests, and live UV updates will appear here."
          />
        ) : (
          groups.map(group => (
            <View key={group.label}>
              {/* Date group header */}
              <View style={st.groupHeader}>
                <View style={st.groupLine} />
                <Text style={st.groupLabel}>{group.label}</Text>
                <View style={st.groupLine} />
              </View>

              {/* Notification cards */}
              {group.data.map(item => {
                const type   = inferType(item);
                const meta   = TYPE_META[type];
                const isUnread = !item.read;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[st.card, isUnread && st.cardUnread]}
                    onPress={() => onPressRow(item.id)}
                    activeOpacity={0.72}>

                    {/* Type icon circle */}
                    <View style={[st.iconCircle, { backgroundColor: meta.bg }]}>
                      <Feather name={meta.icon} size={18} color={meta.color} />
                      {isUnread && <View style={[st.unreadRing, { borderColor: meta.color }]} />}
                    </View>

                    {/* Content */}
                    <View style={st.cardContent}>
                      <View style={st.cardTop}>
                        <View style={[st.typePill, { backgroundColor: meta.bg }]}>
                          <Text style={[st.typePillTxt, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        {isUnread && (
                          <View style={[st.unreadDotSmall, { backgroundColor: meta.color }]} />
                        )}
                      </View>
                      <Text
                        style={[st.cardTitle, !isUnread && st.cardTitleRead]}
                        numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={st.cardBody} numberOfLines={2}>{item.body}</Text>
                      <View style={st.cardFooter}>
                        <Feather name="clock" size={10} color={C.muted} />
                        <Text style={st.cardTime}>
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            hour: 'numeric', minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>

                    <Feather name="chevron-right" size={15} color={C.border} style={st.chevron} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // ── Branded header ───────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.primary,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  headerRing1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 28, borderColor: 'rgba(255,255,255,0.07)',
    top: -60, right: -30,
  },
  headerRing2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 18, borderColor: 'rgba(255,255,255,0.06)',
    top: 10, left: -20,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    gap: 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  headerIconBg: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md, fontWeight: '800', color: '#fff', letterSpacing: -0.3,
  },
  readAllBtn: { minWidth: 64, alignItems: 'flex-end' },
  readAllTxt: { fontSize: FontSize.sm, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  readAllTxtOff: { color: 'rgba(255,255,255,0.4)' },

  headerMeta: { paddingHorizontal: 16, marginTop: 4 },
  unreadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  unreadTxt: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff' },
  allReadBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  allReadTxt: { fontSize: FontSize.xs, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  // ── Date group headers ───────────────────────────────────────────────────────
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 16, marginBottom: 8,
  },
  groupLine: { flex: 1, height: 1, backgroundColor: C.border },
  groupLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: C.muted,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },

  // ── Notification card ────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    gap: 12,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#1E1010', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }
      : Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  cardUnread: {
    borderColor: C.primaryLight,
    backgroundColor: `rgba(155,48,88,0.03)`,
  },

  iconCircle: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'relative',
  },
  unreadRing: {
    position: 'absolute', top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: C.primary,
    backgroundColor: C.primary,
  },

  cardContent: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },

  typePill: {
    paddingHorizontal: 7, paddingVertical: 2.5,
    borderRadius: Radius.full,
  },
  typePillTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  unreadDotSmall: { width: 6, height: 6, borderRadius: 3 },

  cardTitle: {
    fontSize: FontSize.base, fontWeight: '700', color: C.text,
    letterSpacing: -0.2, marginBottom: 3,
  },
  cardTitleRead: { fontWeight: '500', color: C.textSub },
  cardBody: {
    fontSize: FontSize.sm, color: C.muted, lineHeight: 18, marginBottom: 6,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTime: { fontSize: 10, color: C.muted, fontWeight: '500' },

  chevron: { alignSelf: 'center', flexShrink: 0 },
});
