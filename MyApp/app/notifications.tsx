import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FontSize, Space, Radius } from '@/constants/theme';
import {
  loadInbox,
  markAllInboxRead,
  markInboxItemRead,
  type InboxItem,
} from '@/lib/notificationInbox';
import { syncWaterInboxItems } from '@/lib/notificationScheduler';
import { EmptyState } from '@/components/ui/EmptyState';

// Accent color per notification type
type NotifType = 'uv' | 'water' | 'lesion' | 'urgent' | 'default';

function accentColor(type?: string): string {
  switch (type) {
    case 'uv':      return C.amber;
    case 'water':   return '#3B82F6';
    case 'lesion':  return C.primary;
    case 'urgent':  return C.urgentText;
    default:        return C.primary;
  }
}

function inferType(item: InboxItem): NotifType {
  const t = item.title?.toLowerCase() ?? '';
  const b = item.body?.toLowerCase()  ?? '';
  if (t.includes('uv') || b.includes('uv'))       return 'uv';
  if (t.includes('water') || b.includes('water'))  return 'water';
  if (t.includes('urgent') || b.includes('urgent'))return 'urgent';
  if (t.includes('lesion') || b.includes('lesion'))return 'lesion';
  return 'default';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InboxItem[]>([]);

  const refresh = useCallback(async () => {
    await syncWaterInboxItems();
    setItems(await loadInbox());
  }, []);

  useFocusEffect(
    useCallback(() => { void refresh(); }, [refresh]),
  );

  const onPressRow = async (id: string) => {
    await markInboxItemRead(id);
    await refresh();
  };

  const onReadAll = async () => {
    await markAllInboxRead();
    await refresh();
  };

  const unread    = items.filter(i => !i.read).length;
  const hasItems  = items.length > 0;
  const canReadAll = hasItems && unread > 0;

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      {/* ── Top Bar ── */}
      <View style={st.topBar}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={st.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={st.topTitle}>Notifications</Text>

        {/* Mark all read */}
        {hasItems ? (
          <TouchableOpacity
            onPress={canReadAll ? onReadAll : undefined}
            disabled={!canReadAll}
            style={st.readAllBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Mark all read"
            accessibilityState={{ disabled: !canReadAll }}>
            <Text style={[st.readAllTxt, !canReadAll && st.readAllTxtOff]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={st.readAllPlaceholder} />
        )}
      </View>

      {/* Unread count chip */}
      {unread > 0 && (
        <View style={st.unreadChipRow}>
          <View style={st.unreadChip}>
            <View style={st.unreadDot} />
            <Text style={st.unreadChipTxt}>
              {unread} unread notification{unread === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={st.scroll}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}>

        {items.length === 0 ? (
          <EmptyState
            icon="bell-off"
            title="No notifications yet"
            message="Reminders for water, UV digests, and live UV updates will appear here."
          />
        ) : (
          items.map((item, idx) => {
            const type   = inferType(item);
            const accent = accentColor(type);
            const isUnread = !item.read;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  st.row,
                  isUnread && st.rowUnread,
                  idx === items.length - 1 && st.rowLast,
                ]}
                onPress={() => onPressRow(item.id)}
                activeOpacity={0.72}>
                {/* Colored left accent bar */}
                <View style={[st.accentBar, { backgroundColor: accent }]} />

                {/* Content */}
                <View style={st.rowContent}>
                  <View style={st.rowTop}>
                    <Text style={[st.rowTitle, !isUnread && st.rowTitleRead]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {isUnread && <View style={st.unreadBadge} />}
                  </View>
                  <Text style={st.rowBody} numberOfLines={2}>{item.body}</Text>
                  <Text style={st.rowTime}>
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <Feather name="chevron-right" size={16} color={C.muted} style={st.chevron} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[3],
    paddingVertical: Space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: '700',
    color: C.text,
  },
  readAllBtn: {
    minWidth: 90,
    alignItems: 'flex-end',
    paddingVertical: Space[2],
  },
  readAllPlaceholder: { minWidth: 90 },
  readAllTxt: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: C.primary,
  },
  readAllTxtOff: {
    color: C.muted,
    fontWeight: '500',
  },

  // Unread chip
  unreadChipRow: {
    paddingHorizontal: Space[5],
    paddingTop: Space[3],
    paddingBottom: Space[1],
  },
  unreadChip: {
    flexDirection: 'row', alignItems: 'center', gap: Space[2],
    alignSelf: 'flex-start',
    backgroundColor: C.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Space[3],
    paddingVertical: 6,
  },
  unreadDot: {
    width: 7, height: 7, borderRadius: Radius.full,
    backgroundColor: C.primary,
  },
  unreadChipTxt: {
    fontSize: FontSize.xs + 1,
    fontWeight: '600',
    color: C.primary,
  },

  scroll: { flex: 1 },

  // Notification rows
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    minHeight: 72,
  },
  rowUnread: {
    // Slightly tinted background for unread rows
    backgroundColor: `rgba(155, 48, 88, 0.04)`,
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  // Left colored accent bar
  accentBar: {
    width: 4,
    borderRadius: 0,
    alignSelf: 'stretch',
  },

  rowContent: {
    flex: 1,
    paddingVertical: Space[3] + 1,
    paddingLeft: Space[3],
    paddingRight: Space[2],
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    marginBottom: 4,
  },
  rowTitle: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '700',
    color: C.text,
  },
  rowTitleRead: {
    fontWeight: '500',
    color: C.textSub,
  },
  unreadBadge: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.primary,
  },
  rowBody: {
    fontSize: FontSize.sm,
    color: C.muted,
    lineHeight: 19,
    marginBottom: 5,
  },
  rowTime: {
    fontSize: FontSize.xs,
    color: C.muted,
  },

  chevron: {
    alignSelf: 'center',
    marginRight: Space[3],
  },
});
