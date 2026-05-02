import { Pressable, Text, ActivityIndicator, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C, FontFamily, Shadow } from '@/constants/theme';

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

/**
 * Calm, predictable CTA. No spring scale, no bloom. Press feedback is opacity
 * change only — keeps layout stable, accessible.
 */
export function AppButton({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, iconRight = false, style,
}: Props) {
  const isDisabled = disabled || loading;
  const isFilled = variant === 'primary' || variant === 'danger';

  return (
    <View style={style}>
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
            opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          },
          isFilled && Platform.OS === 'ios' ? Shadow.sm : null,
        ]}
        onPress={onPress}
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
