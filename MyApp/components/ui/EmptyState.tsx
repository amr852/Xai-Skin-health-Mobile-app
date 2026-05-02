import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C, FontFamily } from '@/constants/theme';
import { AppButton } from './AppButton';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface Props {
  icon: FeatherIconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'error';
  /** When true, the title renders in italic Source Serif 4 (use sparingly — only on history empty state). */
  italicTitle?: boolean;
}

/**
 * Calm empty state — soft tinted square holds the icon, no wreath/flower.
 * The italicTitle flag is the single sanctioned location for serif italic.
 */
export function EmptyState({ icon, title, message, actionLabel, onAction, variant = 'default', italicTitle }: Props) {
  const isErr = variant === 'error';
  const tint = isErr ? C.urgentText : C.primary;
  const tintBg = isErr ? C.urgentBg : C.primaryLight;

  return (
    <View style={s.wrap}>
      <View style={[s.iconTile, { backgroundColor: tintBg }]}>
        <Feather name={icon} size={26} color={tint} />
      </View>
      <Text style={[s.title, italicTitle && s.titleItalic]}>{title}</Text>
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
    paddingVertical: 36,
    paddingHorizontal: 32,
  },
  iconTile: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  titleItalic: {
    fontSize: 19,
    fontFamily: FontFamily.displayItalic,
    letterSpacing: -0.2,
  },
  msg: {
    fontSize: 13.5,
    fontFamily: FontFamily.body,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 300,
  },
  btn: { minWidth: 160 },
});
