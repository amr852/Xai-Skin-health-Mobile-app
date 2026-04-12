import { View, Text, StyleSheet } from 'react-native';
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
  const iconColor = variant === 'error' ? C.urgentText : C.textHint;
  return (
    <View style={s.wrap}>
      <View style={[s.iconCircle, variant === 'error' && s.iconCircleErr]}>
        <Feather name={icon} size={32} color={iconColor} />
      </View>
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.msg}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant={variant === 'error' ? 'secondary' : 'primary'}
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
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleErr: { backgroundColor: C.urgentBg },
  title: {
    fontSize: 18, fontWeight: '700', color: C.text,
    textAlign: 'center', marginBottom: 8,
  },
  msg: {
    fontSize: 14, color: C.textHint,
    textAlign: 'center', lineHeight: 21,
    marginBottom: 20,
  },
  btn: { minWidth: 140 },
});
