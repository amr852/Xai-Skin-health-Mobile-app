import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C, FontFamily, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet avatar menu — Profile / Notifications / Log out.
 * Mounted once at the app root via UiOverlayProvider; opens consistently from
 * every screen by calling `useUiOverlay().openAvatarMenu()`.
 */
export function AvatarMenu({ visible, onClose }: Props) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'SH';
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

  const goto = (path: string) => () => {
    onClose();
    router.push(path as any);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => { /* swallow */ }}>
          <View style={s.handle} />

          <View style={s.userRow}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName} numberOfLines={1}>{userName}</Text>
              <Text style={s.userSub} numberOfLines={1}>{user?.email ?? 'Registered patient'}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <Item
            icon="user"
            label="My Profile"
            onPress={goto('/profile')}
          />
          <Item
            icon="bell"
            label="Notifications"
            onPress={goto('/notifications')}
          />

          <View style={s.divider} />

          <Item
            icon="log-out"
            label="Log Out"
            destructive
            onPress={handleLogout}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Item({ icon, label, onPress, destructive }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const tint = destructive ? C.urgentText : C.primary;
  const bg = destructive ? C.urgentBg : C.primaryLight;
  return (
    <Pressable
      style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={[s.itemIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={17} color={tint} />
      </View>
      <Text style={[s.itemTxt, destructive && { color: C.urgentText }]}>{label}</Text>
      {!destructive && <Feather name="chevron-right" size={16} color={C.textHint} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: C.border,
    ...(Platform.OS === 'ios' ? Shadow.lg : Platform.OS === 'android' ? { elevation: 12 } : {}),
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: {
    fontSize: 16,
    fontFamily: FontFamily.bodyExtrabold,
    color: '#fff',
  },
  userName: {
    fontSize: 15,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.2,
  },
  userSub: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: C.borderLight, marginVertical: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  itemTxt: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
  },
});
