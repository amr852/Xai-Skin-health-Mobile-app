import { Pressable, Text, ActivityIndicator, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { C, FontFamily, Shadow } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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

const HEIGHT: Record<Size, number> = { sm: 38, md: 48, lg: 54 };
const RADIUS: Record<Size, number> = { sm: 10, md: 12, lg: 14 };
const FONT_SZ: Record<Size, number> = { sm: 13, md: 15, lg: 16 };
const ICON_SZ: Record<Size, number> = { sm: 15, md: 17, lg: 18 };
const PAD_H:   Record<Size, number> = { sm: 14, md: 22, lg: 26 };

const BG:  Record<Variant, string> = { primary: C.primary, secondary: 'transparent', ghost: 'transparent', danger: C.urgentBg };
const CLR: Record<Variant, string> = { primary: '#fff',    secondary: C.primary,     ghost: C.text,       danger: C.urgentText };
const BDR: Record<Variant, string | undefined> = {
  primary: undefined, secondary: C.primary, ghost: 'transparent', danger: C.urgentBorder,
};

const PRESS_SCALE = 0.97;
const PRESS_IN_MS = 110;
const PRESS_OUT_MS = 160;

/**
 * Calm, predictable CTA. Press feedback is a soft 0.97 timing-scale plus a
 * slight opacity dip — no spring overshoot, no bloom. The scale is skipped
 * entirely under OS reduce-motion, falling back to opacity only.
 */
export function AppButton({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, iconRight = false, style,
}: Props) {
  const isDisabled = disabled || loading;
  const isFilled = variant === 'primary' || variant === 'danger';
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const pressAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (reducedMotion) return;
    scale.value = withTiming(PRESS_SCALE, { duration: PRESS_IN_MS, easing: Easing.out(Easing.quad) });
  };
  const onPressOut = () => {
    // Always restore — if reduce-motion flips on mid-press, snap instead of
    // leaving the button stuck at PRESS_SCALE.
    scale.value = reducedMotion
      ? 1
      : withTiming(1, { duration: PRESS_OUT_MS, easing: Easing.out(Easing.quad) });
  };

  return (
    <View style={style}>
      <Animated.View style={pressAnim}>
        <Pressable
          style={({ pressed }) => [
            s.base,
            {
              height: HEIGHT[size],
              borderRadius: RADIUS[size],
              paddingHorizontal: PAD_H[size],
              backgroundColor: BG[variant],
              borderWidth: BDR[variant] ? 1.5 : 0,
              borderColor: BDR[variant],
              opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
            },
            isFilled && Platform.OS === 'ios' ? Shadow.sm : null,
          ]}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled, busy: loading }}
          accessibilityLabel={label}>
          {loading ? (
            <ActivityIndicator size="small" color={CLR[variant]} />
          ) : (
            <>
              {icon && !iconRight && (
                <Feather name={icon} size={ICON_SZ[size]} color={CLR[variant]} />
              )}
              <Text
                numberOfLines={1}
                style={[s.label, { fontSize: FONT_SZ[size], color: CLR[variant] }]}>
                {label}
              </Text>
              {icon && iconRight && (
                <Feather name={icon} size={ICON_SZ[size]} color={CLR[variant]} />
              )}
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
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
    fontFamily: FontFamily.bodySemibold,
    letterSpacing: 0.1,
  },
});
