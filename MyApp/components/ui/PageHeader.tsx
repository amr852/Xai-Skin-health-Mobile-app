import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { C, FontFamily } from '@/constants/theme';

interface Props {
  initials: string;
  name: string;
  unreadCount?: number;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Top-of-screen greeting + avatar + bell. No decorative SVGs — the
 * `onAvatarPress` is wired into the global UiOverlayContext from each screen.
 */
export function PageHeader({ initials, name, unreadCount = 0, onBellPress, onAvatarPress }: Props) {
  return (
    <View style={s.row}>
      <View style={s.left}>
        <Pressable
          onPress={onAvatarPress}
          hitSlop={4}
          disabled={!onAvatarPress}
          style={({ pressed }) => [s.avatar, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Open profile menu">
          <Text style={s.avatarTxt}>{initials}</Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
        </View>
      </View>

      <Pressable
        onPress={onBellPress}
        hitSlop={6}
        style={({ pressed }) => [s.bell, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Notifications">
        <Bell size={20} strokeWidth={1.6} color={C.text} />
        {unreadCount > 0 && (
          <View style={s.dot}>
            <Text style={s.dotNum}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: {
    fontSize: 14,
    fontFamily: FontFamily.bodyExtrabold,
    color: '#fff',
    letterSpacing: 0.2,
  },
  greeting: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textSub,
    letterSpacing: 0.1,
    marginBottom: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: -0.3,
    maxWidth: 220,
  },
  bell: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.borderLight,
  },
  dot: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.primary,
    position: 'absolute', top: 4, right: 4,
    borderWidth: 1.5, borderColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotNum: {
    fontSize: 8,
    fontFamily: FontFamily.bodyExtrabold,
    color: '#fff',
  },
});
