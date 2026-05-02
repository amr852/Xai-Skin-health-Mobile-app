import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { C, FontFamily } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  /** When true, renders as a small uppercase label (used inside dashboards). */
  tracked?: boolean;
}

/**
 * Section heading. No floral underline; either a standard sentence-case heading
 * or a small uppercase tracked label for dashboards.
 */
export function SectionHeader({ title, subtitle, linkLabel, onLinkPress, tracked }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.textCol}>
        <Text style={[s.title, tracked && s.titleTracked]}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {linkLabel && onLinkPress ? (
        <Pressable
          style={({ pressed }) => [s.link, pressed && { opacity: 0.7 }]}
          onPress={onLinkPress}
          hitSlop={6}>
          <Text style={s.linkTxt}>{linkLabel}</Text>
          <ChevronRight size={14} color={C.primary} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  textCol: { flex: 1 },
  title: {
    fontSize: 17,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: -0.3,
  },
  titleTracked: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.textSub,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: FontFamily.body,
    color: C.textSub,
    marginTop: 4,
    lineHeight: 17,
  },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  linkTxt: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
  },
});
