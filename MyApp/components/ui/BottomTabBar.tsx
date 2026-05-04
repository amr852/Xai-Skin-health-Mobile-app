import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Camera, ClipboardList, UserRound } from 'lucide-react-native';
import { C, FontFamily, Shadow } from '@/constants/theme';

export type NavKey = 'home' | 'scan' | 'history' | 'profile';

const TABS: { key: NavKey; Icon: any; label: string }[] = [
  { key: 'home',    Icon: Activity,       label: 'Health'  },
  { key: 'scan',    Icon: Camera,         label: 'Scan'    },
  { key: 'history', Icon: ClipboardList,  label: 'Records' },
  { key: 'profile', Icon: UserRound,      label: 'Profile' },
];

interface Props {
  active: NavKey;
  onPress: (key: NavKey) => void;
}

/**
 * Floating bottom tab bar.
 *  • Lucide icons (stroke-1.5, 22px), no decoration.
 *  • Active state: rose-tinted background with primary-colored icon and label.
 *  • Inactive: muted slate, identical layout (no shift).
 */
export function BottomTabBar({ active, onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        const Icon = tab.Icon;
        return (
          <Pressable
            key={tab.key}
            style={s.tab}
            onPress={() => onPress(tab.key)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}>
            <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
              <Icon
                size={22}
                strokeWidth={1.6}
                color={isActive ? C.primary : C.textSub}
              />
            </View>
            <Text style={[s.label, isActive && s.labelActive]}>{tab.label}</Text>
            {isActive && <View style={s.activeIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14, right: 14, bottom: 10,
    // Explicit stacking — sits above page content but below modals (which use
    // RN <Modal> with their own native overlay) and AppAlert (zIndex >= 100).
    zIndex: 30,
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 22,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...(Platform.OS === 'ios' ? Shadow.md : Platform.OS === 'android' ? { elevation: 12 } : {}),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 50,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: C.primaryLight,
  },
  label: {
    fontSize: 10.5,
    fontFamily: FontFamily.bodyMedium,
    color: C.textHint,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: C.primary,
    fontFamily: FontFamily.bodySemibold,
  },
  activeIndicator: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.primary,
    marginTop: 2,
  },
});
