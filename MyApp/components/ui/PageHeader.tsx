import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';

interface Props {
  initials: string;
  name: string;
  unreadCount?: number;
  onBellPress?: () => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function PageHeader({ initials, name, unreadCount = 0, onBellPress }: Props) {
  return (
    <View style={s.row}>
      <View style={s.left}>
        {/* Double-ring avatar */}
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
        </View>
        <View>
          <Text style={s.greeting}>{getGreeting()},</Text>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
        </View>
      </View>

      {/* Bell with numbered badge */}
      <TouchableOpacity
        style={s.bell}
        onPress={onBellPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Notifications">
        <Feather name="bell" size={18} color={C.primary} />
        {unreadCount > 0 && (
          <View style={s.dot}>
            <Text style={s.dotNum}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
          </View>
        )}
      </TouchableOpacity>
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
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Outer ring gives a halo effect
  avatarRing: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  greeting: { fontSize: 11, color: C.textHint, fontWeight: '500', letterSpacing: 0.2 },
  name: { fontSize: 16, fontWeight: '700', color: C.text, maxWidth: 180 },

  bell: {
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: C.primaryLight,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#DC2626',
    position: 'absolute', top: 7, right: 7,
    borderWidth: 1.5, borderColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotNum: { fontSize: 8, fontWeight: '800', color: '#fff' },
});
