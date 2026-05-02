import { View, Text, StyleSheet } from 'react-native';
import { C, FontFamily } from '@/constants/theme';

type Status = 'Stable' | 'Check' | 'Urgent';

const META: Record<Status, { text: string; bg: string; dot: string }> = {
  Stable: { text: C.stableText, bg: C.stableBg,  dot: '#16A34A' },
  Check:  { text: C.checkText,  bg: C.checkBg,   dot: '#D97706' },
  Urgent: { text: C.urgentText, bg: C.urgentBg,  dot: '#DC2626' },
};

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const m = META[status] ?? META.Stable;
  const isSm = size === 'sm';
  return (
    <View style={[s.badge, { backgroundColor: m.bg }, isSm && s.badgeSm]}>
      <View style={[s.dot, { backgroundColor: m.dot }, isSm && s.dotSm]} />
      <Text style={[s.txt, { color: m.text }, isSm && s.txtSm]}>{status}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotSm: { width: 5, height: 5, borderRadius: 3 },
  txt: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemibold,
    letterSpacing: 0.2,
  },
  txtSm: { fontSize: 11 },
});
