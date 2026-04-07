import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';
import {
  loadInbox,
  markAllInboxRead,
  markInboxItemRead,
  type InboxItem,
} from '@/lib/notificationInbox';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InboxItem[]>([]);

  const refresh = useCallback(async () => {
    setItems(await loadInbox());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onPressRow = async (id: string) => {
    await markInboxItemRead(id);
    await refresh();
  };

  const onReadAll = async () => {
    await markAllInboxRead();
    await refresh();
  };

  const unread = items.filter(i => !i.read).length;
  const hasItems = items.length > 0;
  const canReadAll = hasItems && unread > 0;

  return (
    <SafeAreaView style={st.safe}>
      <View style={[st.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={st.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <Feather name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={st.topTitle}>Notifications</Text>
        {hasItems ? (
          <TouchableOpacity
            onPress={canReadAll ? onReadAll : undefined}
            disabled={!canReadAll}
            style={st.readAllBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Read all notifications"
            accessibilityState={{ disabled: !canReadAll }}>
            <Text style={[st.readAllTxt, !canReadAll && st.readAllTxtDisabled]}>Read all</Text>
          </TouchableOpacity>
        ) : (
          <View style={st.readAllPlaceholder} />
        )}
      </View>

      {canReadAll ? (
        <View style={st.readAllBannerWrap}>
          <TouchableOpacity
            style={st.readAllBanner}
            onPress={onReadAll}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Read all notifications">
            <Feather name="check-circle" size={20} color={C.white} />
            <Text style={st.readAllBannerTxt}>Read all notifications</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={st.scroll}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={st.empty}>
            <Feather name="bell-off" size={40} color={C.muted} />
            <Text style={st.emptyTitle}>No notifications yet</Text>
            <Text style={st.emptySub}>
              Reminders for water, UV digests, and live UV updates will appear here. Pull to refresh
              on Home for the latest UV reading.
            </Text>
          </View>
        ) : (
          items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[st.row, !item.read && st.rowUnread]}
              onPress={() => onPressRow(item.id)}
              activeOpacity={0.7}>
              <View style={[st.dot, { backgroundColor: item.read ? C.border : C.blue }]} />
              <View style={st.rowBody}>
                <Text style={[st.rowTitle, item.read && st.rowTitleRead]}>{item.title}</Text>
                <Text style={st.rowBodyTxt}>{item.body}</Text>
                <Text style={st.rowTime}>
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.muted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  readAllBtn: { minWidth: 72, alignItems: 'flex-end', paddingVertical: 8 },
  readAllPlaceholder: { minWidth: 72 },
  readAllTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: C.blue,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  readAllTxtDisabled: {
    color: C.muted,
    fontWeight: '500',
  },
  readAllBannerWrap: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  readAllBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.blue,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  readAllBannerTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  scroll: { flex: 1 },
  empty: {
    paddingHorizontal: 32,
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  emptySub: {
    marginTop: 8,
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: 12,
  },
  rowUnread: { backgroundColor: 'rgba(30, 122, 174, 0.06)' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  rowTitleRead: { fontWeight: '600', color: C.muted },
  rowBodyTxt: {
    marginTop: 4,
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  rowTime: {
    marginTop: 6,
    fontSize: 11,
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
});
