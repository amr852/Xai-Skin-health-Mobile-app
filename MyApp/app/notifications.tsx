import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FontFamily } from '@/constants/theme';
import { Bell, Sun, Droplet, ZoomIn, AlertCircle, Shield } from 'lucide-react-native';
import { Hairline } from '@/components/decor/Hairline';
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

      {/* ── 56-px inbox header — title + Mark all read inline ── */}
      <View style={st.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={st.backBtn}
          hitSlop={12}
          accessibilityLabel="Back">
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Notifications</Text>
          {unread > 0 && <Text style={st.headerSub}>{unread} unread</Text>}
        </View>
        {hasItems && unread > 0 ? (
          <TouchableOpacity onPress={onReadAll} hitSlop={6} style={st.readAllBtn} accessibilityLabel="Mark all read">
            <Text style={st.readAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={st.readAllBtn} />
        )}
      </View>
      <Hairline width={'100%'} fadeInset={0} />

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
              {/* Date group header — left-aligned uppercase tracked label */}
              <View style={st.groupHeader}>
                <Text style={st.groupLabel}>{group.label}</Text>
                <View style={st.groupHairline}>
                  <Hairline width={'100%'} />
                </View>
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

                    {/* Type icon — Lucide stroke 1.6 in tinted square */}
                    <View style={[st.iconCircle, { backgroundColor: meta.bg }]}>
                      {type === 'sun' ? (
                        <Shield size={20} color={meta.color} strokeWidth={1.7} />
                      ) : type === 'uv' ? (
                        <Sun size={20} color={meta.color} strokeWidth={1.7} />
                      ) : type === 'water' ? (
                        <Droplet size={20} color={meta.color} strokeWidth={1.7} />
                      ) : type === 'lesion' ? (
                        <ZoomIn size={20} color={meta.color} strokeWidth={1.7} />
                      ) : type === 'urgent' ? (
                        <AlertCircle size={20} color={meta.color} strokeWidth={1.7} />
                      ) : (
                        <Bell size={20} color={meta.color} strokeWidth={1.7} />
                      )}
                    </View>

                    {/* Content */}
                    <View style={st.cardContent}>
                      <View style={st.cardTop}>
                        <Text style={[st.typeLabel, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                        <Text style={st.cardTime}>
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            hour: 'numeric', minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[st.cardTitle, !isUnread && st.cardTitleRead]}
                        numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={st.cardBody} numberOfLines={2}>{item.body}</Text>
                    </View>

                    {/* Right-edge unread dot — single rose pip, never a ring */}
                    {isUnread && <View style={st.unreadEdgeDot} />}
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

  // ── 56-px inbox header — title + Mark all read inline ──────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 56,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11.5,
    fontFamily: FontFamily.body,
    color: C.textSub,
    marginTop: 1,
  },
  readAllBtn: { minWidth: 90, alignItems: 'flex-end' },
  readAllTxt: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
    letterSpacing: 0.1,
  },

  // ── Date group headers — left-aligned tracked label + hairline ──────
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 18, marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupHairline: { flex: 1 },
  groupLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.textSub,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Notification card — inbox-density row ─────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: '#FFFCFD',
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 3,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  cardTitleRead: {
    fontFamily: FontFamily.body,
    color: C.textSub,
  },
  cardBody: {
    fontSize: 12.5,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 17,
  },
  cardTime: {
    fontSize: 10.5,
    fontFamily: FontFamily.bodyMedium,
    color: C.textHint,
    letterSpacing: 0.2,
  },
  // Right-edge unread dot — single rose pip
  unreadEdgeDot: {
    position: 'absolute',
    right: 12, top: 14,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.primary,
  },
});
