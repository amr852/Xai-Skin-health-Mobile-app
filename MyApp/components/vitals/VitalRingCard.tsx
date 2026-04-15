import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';
import { C, FontSize, Radius, Shadow, Space } from '@/constants/theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface VitalRingCardProps {
  icon: FeatherIconName;
  label: string;
  value: string;
  unit: string;
  status: string;
  accent: string;
  accentSoft: string;
  fillPct: number;
  targetText?: string;
  chips?: { label: string; onPress: () => void; active?: boolean }[];
  onReset?: () => void;
}

const SIZE = 108;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function Chip({ label, onPress, active, accent, accentSoft }: {
  label: string; onPress: () => void; active?: boolean; accent: string; accentSoft: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        { backgroundColor: active ? accent : accentSoft, opacity: pressed ? 0.75 : 1 },
      ]}>
      <Text
        style={[
          s.chipTxt,
          { color: active ? '#fff' : accent },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function VitalRingCard(props: VitalRingCardProps) {
  const {
    icon, label, value, unit, status,
    accent, accentSoft, fillPct, targetText,
    chips = [], onReset,
  } = props;

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, fillPct)),
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fillPct, anim]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRC, 0],
  });

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={[s.iconWrap, { backgroundColor: accentSoft }]}>
          <Feather name={icon} size={14} color={accent} />
        </View>
        <Text style={s.label} numberOfLines={1}>{label}</Text>
        {onReset && fillPct > 0 ? (
          <Pressable onPress={onReset} hitSlop={8} style={s.resetBtn} accessibilityLabel={`Reset ${label}`}>
            <Feather name="rotate-ccw" size={12} color={C.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={s.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={accentSoft}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRC}, ${CIRC}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={s.ringCenter} pointerEvents="none">
          <Text style={s.valueTxt}>{value}</Text>
          <Text style={s.unitTxt}>{unit}</Text>
        </View>
      </View>

      {targetText ? <Text style={s.target}>{targetText}</Text> : null}

      <View style={s.statusRow}>
        <View style={[s.dot, { backgroundColor: accent }]} />
        <Text style={[s.status, { color: accent }]} numberOfLines={1}>{status}</Text>
      </View>

      {chips.length > 0 ? (
        <View style={s.chipsRow}>
          {chips.map((c, i) => (
            <Chip
              key={`${c.label}-${i}`}
              label={c.label}
              onPress={c.onPress}
              active={c.active}
              accent={accent}
              accentSoft={accentSoft}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: Space[4],
    paddingHorizontal: Space[3],
    alignItems: 'center',
    ...Shadow.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    marginBottom: Space[2],
  },
  iconWrap: {
    width: 22, height: 22, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: FontSize.xs + 1,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.2,
  },
  resetBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  ringWrap: {
    width: SIZE, height: SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  valueTxt: {
    fontSize: 26, fontWeight: '800', color: C.text,
    letterSpacing: -1, lineHeight: 28,
  },
  unitTxt: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: C.muted,
    marginTop: 1,
    letterSpacing: 0.4,
  },

  target: {
    fontSize: FontSize.xs,
    color: C.muted,
    marginTop: 2,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Space[2],
    marginBottom: Space[2],
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  status: { fontSize: FontSize.xs, fontWeight: '600' },

  chipsRow: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'stretch',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  chipTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
