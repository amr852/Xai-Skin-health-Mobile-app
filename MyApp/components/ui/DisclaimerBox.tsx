import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';

interface Props {
  text?: string;
}

export function DisclaimerBox({ text = 'For tracking only. Always consult a qualified dermatologist for medical advice.' }: Props) {
  return (
    <View style={s.box}>
      <Feather name="alert-triangle" size={15} color={C.amber} style={s.icon} />
      <Text style={s.txt}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.warnBg,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.warnBorder,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  icon: { marginTop: 1 },
  txt: {
    flex: 1,
    fontSize: 12,
    color: C.warnText,
    lineHeight: 18,
  },
});
