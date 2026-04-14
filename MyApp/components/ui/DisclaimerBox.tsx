import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';

interface Props {
  text?: string;
}

export function DisclaimerBox({ text = 'For tracking only. Always consult a qualified dermatologist for medical advice.' }: Props) {
  return (
    <View style={s.box}>
      <View style={s.iconCircle}>
        <Feather name="info" size={14} color={C.amber} />
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
    backgroundColor: C.warnBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.warnBorder,
    borderLeftWidth: 3,
    borderLeftColor: C.amberFill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  iconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.amberLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  txt: {
    flex: 1,
    fontSize: 12,
    color: C.warnText,
    lineHeight: 18,
  },
});
