import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: FeatherIconName;
  iconRight?: boolean;
  style?: ViewStyle;
}

const HEIGHT:   Record<Size, number> = { sm: 38, md: 48, lg: 52 };
const RADIUS:   Record<Size, number> = { sm: 10, md: 12, lg: 14 };
const FONT_SZ:  Record<Size, number> = { sm: 13, md: 15, lg: 16 };
const ICON_SZ:  Record<Size, number> = { sm: 15, md: 17, lg: 18 };
const PAD_H:    Record<Size, number> = { sm: 14, md: 20, lg: 24 };

const BG:   Record<Variant, string> = { primary: C.primary, secondary: 'transparent', ghost: 'transparent', danger: C.urgentBg };
const CLR:  Record<Variant, string> = { primary: '#fff', secondary: C.primary, ghost: C.text, danger: C.urgentText };
const BDR:  Record<Variant, string | undefined> = { primary: undefined, secondary: C.primary, ghost: 'transparent', danger: C.urgentBorder };

export function AppButton({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, iconRight = false, style,
}: Props) {
  const isDisabled = disabled || loading;
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onIn = () => {
    if (reduce) return;
    scale.value = withTiming(0.96, { duration: 90 });
  };
  const onOut = () => {
    if (reduce) return;
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        style={[
          s.base,
          {
            height:           HEIGHT[size],
            borderRadius:     RADIUS[size],
            paddingHorizontal: PAD_H[size],
            backgroundColor:  BG[variant],
            borderWidth:      BDR[variant] ? 1.5 : 0,
            borderColor:      BDR[variant],
            opacity:          isDisabled ? 0.55 : 1,
          },
        ]}
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        disabled={isDisabled}>
        {loading ? (
          <ActivityIndicator size="small" color={CLR[variant]} />
        ) : (
          <>
            {icon && !iconRight && (
              <Feather name={icon} size={ICON_SZ[size]} color={CLR[variant]} />
            )}
            <Text style={[s.label, { fontSize: FONT_SZ[size], color: CLR[variant] }]}>
              {label}
            </Text>
            {icon && iconRight && (
              <Feather name={icon} size={ICON_SZ[size]} color={CLR[variant]} />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
