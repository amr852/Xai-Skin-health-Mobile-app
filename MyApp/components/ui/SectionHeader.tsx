import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  linkLabel?: string;
  onLinkPress?: () => void;
}

export function SectionHeader({ title, subtitle, linkLabel, onLinkPress }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.textCol}>
        {/* Title row with left accent dot */}
        <View style={s.titleRow}>
          <View style={s.accentDot} />
          <Text style={s.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {linkLabel && onLinkPress ? (
        <TouchableOpacity style={s.link} onPress={onLinkPress} activeOpacity={0.7}>
          <Text style={s.linkTxt}>{linkLabel}</Text>
          <View style={s.linkArrow}>
            <Feather name="chevron-right" size={12} color={C.primary} />
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  textCol: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentDot: {
    width: 4, height: 18,
    borderRadius: 2,
    backgroundColor: C.primary,
  },
  title: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, color: C.textHint, marginTop: 4, marginLeft: 12 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2,
  },
  linkTxt: { fontSize: 12, fontWeight: '600', color: C.primary },
  linkArrow: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
});
