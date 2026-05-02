import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';
import { C, FontFamily, FontSize, Radius, Shadow, Space } from '@/constants/theme';

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

const SIZE = 116;
const STROKE = 8;
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
      <Text style={[s.chipTxt, { color: active ? '#fff' : accent }]}>{label}</Text>
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
          <Pressable
            onPress={onReset}
            hitSlop={8}
            style={s.resetBtn}
            accessibilityLabel={`Reset ${label}`}>
            <Feather name="rotate-ccw" size={12} color={C.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={s.ringWrap}>
        {/* Faint instrumentation grid behind the ring — reads as medical, not decorative */}
        <View style={s.gridBackplate} pointerEvents="none">
          {[1, 2, 3, 4].map(i => (
            <View
              key={`v-${i}`}
              style={[s.gridLineV, { left: (SIZE / 5) * i }]}
            />
          ))}
          {[1, 2, 3, 4].map(i => (
            <View
              key={`h-${i}`}
              style={[s.gridLineH, { top: (SIZE / 5) * i }]}
            />
          ))}
        </View>
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
        {/* Centered numeric value — content-aware size so '1h 30m' never overflows */}
        <View style={s.ringCenter} pointerEvents="none">
          <Text
            style={[
              s.valueTxt,
              // Compact form (e.g. "1h 30m") gets a smaller base size so it fits the ring.
              value.includes(' ') && s.valueTxtCompact,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}>
            {value}
          </Text>
          {/* Hide the unit row entirely when the value already carries its unit — */}
          {/* otherwise the ring center renders two stacked rows for sleep h+m. */}
          {unit ? <Text style={s.unitTxt}>{unit}</Text> : null}
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: Space[4],
    paddingHorizontal: Space[3],
    alignItems: 'center',
    ...Shadow.xs,
    // Soft inner-top inset highlight — replaces the floral decoration with depth
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }
      : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    marginBottom: Space[2],
  },
  iconWrap: {
    width: 22, height: 22, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: FontSize.xs + 1,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: 0.3,
  },
  resetBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  ringWrap: {
    width: SIZE, height: SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  // Dotted-grid backplate — single instrumentation flourish
  gridBackplate: {
    position: 'absolute',
    width: SIZE, height: SIZE,
    opacity: 0.35,
  },
  gridLineV: {
    position: 'absolute',
    top: 0, bottom: 0, width: 1,
    backgroundColor: C.border,
    opacity: 0.5,
  },
  gridLineH: {
    position: 'absolute',
    left: 0, right: 0, height: 1,
    backgroundColor: C.border,
    opacity: 0.5,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  valueTxt: {
    fontSize: 32,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -1,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    paddingHorizontal: 8, // gives the auto-shrinker breathing room before clipping
  },
  // Smaller base size for compound values like "1h 30m" so they fit the ring.
  valueTxtCompact: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  unitTxt: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemibold,
    color: C.muted,
    marginTop: 0,
    letterSpacing: 0.6,
  },

  target: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
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
  status: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemibold,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'stretch',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  chipTxt: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.3,
  },
});
