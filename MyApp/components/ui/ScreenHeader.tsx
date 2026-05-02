import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C, FontFamily } from '@/constants/theme';

interface Props {
  /** Title rendered centered when no `left`/`right` competes for space. */
  title?: string;
  /** Override left slot. Pass `false` to suppress the back button. */
  left?: ReactNode | false;
  /** Right-side action (e.g. Mark all read). */
  right?: ReactNode;
  /** Background — default surface. Use 'transparent' atop GradientHero. */
  background?: string;
  /** Text/icon color — auto contrasts with background. */
  tone?: 'dark' | 'light';
  /** Optional bottom hairline. Default true on dark-on-light. */
  showDivider?: boolean;
}

export function ScreenHeader({
  title, left, right, background = C.surface, tone = 'dark', showDivider = true,
}: Props) {
  const router = useRouter();
  const fg = tone === 'light' ? '#fff' : C.text;

  const leftNode = left === false ? <View style={s.slot} />
    : left ?? (
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }, tone === 'light' && s.iconBtnOnDark]}
        accessibilityRole="button"
        accessibilityLabel="Back">
        <Feather name="arrow-left" size={20} color={fg} />
      </Pressable>
    );

  return (
    <View>
      <View style={[s.row, { backgroundColor: background }]}>
        <View style={s.slot}>{leftNode}</View>
        <View style={s.titleWrap}>
          {title ? <Text style={[s.title, { color: fg }]} numberOfLines={1}>{title}</Text> : null}
        </View>
        <View style={[s.slot, s.slotRight]}>
          {right ?? <View style={{ width: 38 }} />}
        </View>
      </View>
      {showDivider && tone === 'dark' && <View style={s.divider} />}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  slot: {
    minWidth: 44,
    alignItems: 'flex-start',
  },
  slotRight: { alignItems: 'flex-end' },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: FontFamily.bodySemibold,
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBtnOnDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: Platform.OS === 'ios' ? 0 : 0,
  },
  divider: {
    height: 1,
    backgroundColor: C.borderLight,
  },
});
