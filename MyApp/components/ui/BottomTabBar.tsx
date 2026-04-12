import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';

export type NavKey = 'home' | 'scan' | 'history' | 'profile';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const TABS: { key: NavKey; icon: FeatherIconName; label: string }[] = [
  { key: 'home',    icon: 'activity',   label: 'Health'  },
  { key: 'scan',    icon: 'aperture',   label: 'Scan'    },
  { key: 'history', icon: 'file-text',  label: 'Records' },
  { key: 'profile', icon: 'user',       label: 'Profile' },
];

interface Props {
  active: NavKey;
  onPress: (key: NavKey) => void;
}

export function BottomTabBar({ active, onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => onPress(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}>
            <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
              <Feather name={tab.icon} size={20} color={isActive ? '#fff' : C.textHint} />
            </View>
            <Text style={[s.label, isActive && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14, right: 14, bottom: 10,
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#1E1010', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.13, shadowRadius: 20 }
      : Platform.OS === 'android' ? { elevation: 16 } : {}),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 46,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: C.primary,
    borderRadius: 13,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: C.textHint,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: C.primary,
    fontWeight: '700',
  },
});
