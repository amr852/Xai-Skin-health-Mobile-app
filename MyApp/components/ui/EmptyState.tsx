import { View, Text, StyleSheet, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';
import { AppButton } from './AppButton';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface Props {
  icon: FeatherIconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'error';
}

export function EmptyState({ icon, title, message, actionLabel, onAction, variant = 'default' }: Props) {
  const isErr = variant === 'error';
  const iconColor = isErr ? C.urgentText : C.primary;
  return (
    <View style={s.wrap}>
      {/* Outer ring + inner circle for a medical-badge feel */}
      <View style={[s.iconRing, isErr && s.iconRingErr]}>
        <View style={[s.iconCircle, isErr && s.iconCircleErr]}>
          <Feather name={icon} size={28} color={iconColor} />
        </View>
      </View>
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.msg}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant={variant === 'error' ? 'danger' : 'primary'}
          size="sm"
          style={s.btn}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5, borderColor: C.border,
    ...(Platform.OS === 'ios'
      ? { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 }
      : Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  iconRingErr: {
    backgroundColor: C.urgentBg,
    borderColor: C.urgentBorder,
  },
  iconCircle: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleErr: { backgroundColor: '#FFF1F1' },
  title: {
    fontSize: 17, fontWeight: '700', color: C.text,
    textAlign: 'center', marginBottom: 8, letterSpacing: -0.2,
  },
  msg: {
    fontSize: 13, color: C.textHint,
    textAlign: 'center', lineHeight: 20,
    marginBottom: 20,
  },
  btn: { minWidth: 140 },
});
