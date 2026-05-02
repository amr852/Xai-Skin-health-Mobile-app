import { View, Text, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { C, FontFamily } from '@/constants/theme';

interface Props {
  text?: string;
}

export function DisclaimerBox({
  text = 'For tracking only. Always consult a qualified dermatologist for medical advice.',
}: Props) {
  return (
    <View style={s.box}>
      <View style={s.iconCircle}>
        <Info size={14} color={C.textSub} strokeWidth={1.8} />
      </View>
      <Text style={s.txt}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  iconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  txt: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 18,
  },
});
