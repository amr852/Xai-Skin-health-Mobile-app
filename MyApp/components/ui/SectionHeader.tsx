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
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {linkLabel && onLinkPress ? (
        <TouchableOpacity style={s.link} onPress={onLinkPress} activeOpacity={0.7}>
          <Text style={s.linkTxt}>{linkLabel}</Text>
          <Feather name="chevron-right" size={14} color={C.primary} />
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
    marginBottom: 10,
  },
  textCol: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, color: C.textHint, marginTop: 3 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 2 },
  linkTxt: { fontSize: 13, fontWeight: '600', color: C.primary },
});
