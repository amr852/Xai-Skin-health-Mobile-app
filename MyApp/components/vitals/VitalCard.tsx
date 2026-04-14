import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';
import {
  formatDecimalHoursAsClock,
  formatTargetHours,
  vitalsGoalLeftAmount,
} from '@/components/vitals/vitalsFormat';
import { vitalStyles as s } from '@/components/vitals/vitalStyles';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export type VitalLayout = 'wave' | 'segments' | 'panel' | 'sleepWave' | 'waterBottle' | 'sleepBed';

export interface VitalCardProps {
  icon: FeatherIconName;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
  status: string;
  statusColor: string;
  fillColor: string;
  fillPct: number;
  layout: VitalLayout;
  segmentLabels?: string[];
  segmentActiveIndex?: number;
  panelSubtitle?: string;
  panelPillA?: { text: string; dot: string; bg: string; textColor: string };
  panelPillB?: { text: string; dot: string; bg: string; textColor: string };
  sleepActualDisplay?: string;
  sleepTargetDisplay?: string;
  sleepTargetHours?: number;
  hideGoalFooter?: boolean;
  vsGoalRight?: string;
  // Legacy stepper props (kept for compat)
  onStepDown?: () => void;
  onStepUp?: () => void;
  stepDownDisabled?: boolean;
  stepUpDisabled?: boolean;
  // New interaction props
  onQuickAdd?: (amount: number) => void;   // water quick-log chips
  onReset?: () => void;                    // water reset
  onSetSleepHours?: (hours: number) => void; // sleep preset pills
  sleepHoursRaw?: number;                  // raw numeric for highlighting active preset
}

export function VitalCard(props: VitalCardProps) {
  const {
    icon,
    iconColor,
    label,
    value,
    unit,
    status,
    statusColor,
    fillColor,
    fillPct,
    layout,
    segmentLabels = [],
    segmentActiveIndex = 0,
    panelSubtitle,
    panelPillA,
    panelPillB,
    sleepActualDisplay,
    sleepTargetDisplay,
    sleepTargetHours,
    onStepDown,
    onStepUp,
    stepDownDisabled,
    stepUpDisabled,
    hideGoalFooter,
    vsGoalRight,
    onQuickAdd,
    onReset,
    onSetSleepHours,
    sleepHoursRaw,
  } = props;

  const uNorm = unit.trim().toLowerCase();
  const isHourUnit =
    uNorm === 'h' ||
    uNorm === 'hr' ||
    uNorm === 'hrs' ||
    uNorm === 'hour' ||
    uNorm === 'hours';
  const showSleepVsTarget =
    sleepActualDisplay != null ||
    sleepTargetDisplay != null ||
    sleepTargetHours != null ||
    isHourUnit;

  const sleptStr = sleepActualDisplay ?? formatDecimalHoursAsClock(value, unit);
  const targetStr =
    sleepTargetDisplay ??
    (sleepTargetHours != null
      ? formatTargetHours(sleepTargetHours)
      : isHourUnit
        ? formatTargetHours(8)
        : '');

  const pillA = panelPillA ?? {
    text: label,
    dot: fillColor,
    bg: `${fillColor}22`,
    textColor: C.text,
  };
  const pillB = panelPillB ?? {
    text: status,
    dot: statusColor,
    bg: `${statusColor}18`,
    textColor: statusColor,
  };

  // ── Water-bottle fill card ─────────────────────────────────────────────────
  if (layout === 'waterBottle') {
    return <WaterBottleCard {...props} />;
  }

  // ── Sleep-bed card ────────────────────────────────────────────────────────
  if (layout === 'sleepBed') {
    return <SleepBedCard {...props} />;
  }

  if (layout === 'sleepWave') {
    return (
      <View style={s.vBoxSleepWave}>
        <View style={s.vWaveHead}>
          <View style={s.vWhiteIconCircle}>
            <Feather name={icon} size={20} color={iconColor} />
          </View>
          <Text style={s.vWaveTitle}>{label}</Text>
        </View>
        {showSleepVsTarget ? (
          <View style={s.vValueStepperRow}>
            {onStepDown != null ? (
              <TouchableOpacity
                style={[s.vStepBtn, stepDownDisabled && s.vStepBtnDisabled]}
                onPress={onStepDown}
                disabled={stepDownDisabled}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Decrease sleep">
                <Text style={btn.symbol}>−</Text>
              </TouchableOpacity>
            ) : null}
            <View style={[s.vVitalsGoalRow, s.vStepperValueMid]}>
              <Text style={s.vVitalsGoalText}>{sleptStr}</Text>
              <Text style={s.vVitalsGoalText}> / </Text>
              {hideGoalFooter ? (
                <Text style={s.vVitalsGoalText}>{targetStr}</Text>
              ) : (
                <View style={s.vSleepWaveTargetCol}>
                  <Text style={s.vVitalsGoalText}>{targetStr}</Text>
                  <Text style={s.vSleepWaveTargetLbl}>target</Text>
                </View>
              )}
            </View>
            {onStepUp != null ? (
              <TouchableOpacity
                style={[s.vStepBtn, stepUpDisabled && s.vStepBtnDisabled]}
                onPress={onStepUp}
                disabled={stepUpDisabled}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Increase sleep">
                <Text style={btn.symbol}>+</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={s.vValueStepperRow}>
            {onStepDown != null ? (
              <TouchableOpacity
                style={[s.vStepBtn, stepDownDisabled && s.vStepBtnDisabled]}
                onPress={onStepDown}
                disabled={stepDownDisabled}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${label}`}>
                <Text style={btn.symbol}>−</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={s.vWaveBig}>
              {value}
              <Text style={s.vWaveUnit}> {unit}</Text>
            </Text>
            {onStepUp != null ? (
              <TouchableOpacity
                style={[s.vStepBtn, stepUpDisabled && s.vStepBtnDisabled]}
                onPress={onStepUp}
                disabled={stepUpDisabled}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${label}`}>
                <Text style={btn.symbol}>+</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        {panelSubtitle ? (
          <Text style={s.vSleepWaveSub}>{panelSubtitle}</Text>
        ) : null}
        <View style={s.vWaveStatusRow}>
          <View style={[s.vStatusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.vWaveStatus, { color: statusColor }]}>{status}</Text>
        </View>
        <View style={s.vBarBgSleepWave}>
          <View style={[s.vBarFill, { width: `${fillPct}%`, backgroundColor: fillColor }]} />
        </View>
      </View>
    );
  }

  if (layout === 'wave') {
    return (
      <View style={s.vBoxWave}>
        <View style={s.vWaveHead}>
          <View style={s.vWhiteIconCircle}>
            <Feather name={icon} size={20} color={iconColor} />
          </View>
          <Text style={s.vWaveTitle}>{label}</Text>
        </View>
        <View style={s.vValueStepperRow}>
          {onStepDown != null ? (
            <TouchableOpacity
              style={[s.vStepBtn, stepDownDisabled && s.vStepBtnDisabled]}
              onPress={onStepDown}
              disabled={stepDownDisabled}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Decrease ${label}`}>
              <Feather name="minus" size={16} color={C.diagLine} />
            </TouchableOpacity>
          ) : null}
          {vsGoalRight != null && vsGoalRight !== '' ? (
            <View style={[s.vVitalsGoalRow, s.vStepperValueMid]}>
              <Text style={s.vVitalsGoalText}>{vitalsGoalLeftAmount(value, unit)}</Text>
              <Text style={s.vVitalsGoalText}> / </Text>
              {hideGoalFooter ? (
                <Text style={s.vVitalsGoalText}>{vsGoalRight}</Text>
              ) : (
                <View style={s.vSleepWaveTargetCol}>
                  <Text style={s.vVitalsGoalText}>{vsGoalRight}</Text>
                  <Text style={s.vSleepWaveTargetLbl}>target</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.vStepperValueMid}>
              <Text style={s.vWaveBig}>
                {value}
                <Text style={s.vWaveUnit}> {unit}</Text>
              </Text>
            </View>
          )}
          {onStepUp != null ? (
            <TouchableOpacity
              style={[s.vStepBtn, stepUpDisabled && s.vStepBtnDisabled]}
              onPress={onStepUp}
              disabled={stepUpDisabled}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Increase ${label}`}>
              <Feather name="plus" size={16} color={C.diagLine} />
            </TouchableOpacity>
          ) : null}
        </View>
        {panelSubtitle ? (
          <Text style={s.vSleepWaveSub}>{panelSubtitle}</Text>
        ) : null}
        <View style={s.vWaveStatusRow}>
          <View style={[s.vStatusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.vWaveStatus, { color: statusColor }]}>{status}</Text>
        </View>
        <View style={s.vBarBgWave}>
          <View style={[s.vBarFill, { width: `${fillPct}%`, backgroundColor: fillColor }]} />
        </View>
      </View>
    );
  }

  if (layout === 'segments') {
    const segs: string[] =
      segmentLabels.length >= 4
        ? segmentLabels.slice(0, 4)
        : (() => {
            const base = [...segmentLabels];
            while (base.length < 4) base.push('—');
            return base;
          })();
    const active = Math.min(3, Math.max(0, segmentActiveIndex));
    return (
      <View style={s.vBoxSeg}>
        <View style={s.vSegTop}>
          <View style={s.vWhiteIconCircleSm}>
            <Feather name={icon} size={22} color={iconColor} />
          </View>
          <View style={s.vSegTitleBlock}>
            <Text style={s.vSegBig}>
              {value}
              <Text style={s.vSegBigUnit}> {unit}</Text>
            </Text>
            <Text style={s.vSegSub}>{label}</Text>
          </View>
        </View>
        <View style={s.vSegStatusRow}>
          <View style={[s.vStatusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.vSegStatus, { color: statusColor }]}>{status}</Text>
        </View>
        <View style={s.vSegBarRow}>
          {segs.map((lbl, i) => (
            <View key={`${lbl}-${i}`} style={s.vSegCell}>
              <View
                style={[
                  s.vSegChunk,
                  i === active
                    ? { backgroundColor: C.diagYellowDeep }   // terracotta active
                    : { backgroundColor: 'rgba(255,255,255,0.55)' }, // soft inactive
                ]}
              />
              <Text style={s.vSegLbl} numberOfLines={1}>
                {lbl}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.vBoxPanel}>
      <View style={s.vPanelLeft}>
        <View style={s.vPanelMoonCircle}>
          <Feather name={icon} size={30} color={iconColor} />
        </View>
      </View>
      <View style={s.vPanelRight}>
        <View style={s.vPanelTitleRow}>
          <Text style={s.vPanelTitle}>{label}</Text>
        </View>
        {showSleepVsTarget ? (
          <View style={s.vPanelSleepRow}>
            <Text style={s.vVitalsGoalText}>{sleptStr}</Text>
            <Text style={s.vVitalsGoalText}> / </Text>
            {hideGoalFooter ? (
              <Text style={s.vVitalsGoalText}>{targetStr}</Text>
            ) : (
              <View>
                <Text style={s.vVitalsGoalText}>{targetStr}</Text>
                <Text style={s.vPanelSleepTargetLbl}>target</Text>
              </View>
            )}
          </View>
        ) : null}
        <Text style={s.vPanelDesc}>{panelSubtitle ?? `${status} — keep it up.`}</Text>
        <View style={s.vPanelPills}>
          <View style={[s.vPanelPill, { backgroundColor: pillA.bg }]}>
            <View style={[s.vPanelPillDot, { backgroundColor: pillA.dot }]} />
            <Text style={[s.vPanelPillTxt, { color: pillA.textColor }]}>{pillA.text}</Text>
          </View>
          <View style={[s.vPanelPill, { backgroundColor: pillB.bg }]}>
            <View style={[s.vPanelPillDot, { backgroundColor: pillB.dot }]} />
            <Text style={[s.vPanelPillTxt, { color: pillB.textColor }]}>{pillB.text}</Text>
          </View>
        </View>
        <View style={s.vBarBgPanel}>
          <View style={[s.vBarFill, { width: `${fillPct}%`, backgroundColor: fillColor }]} />
        </View>
      </View>
    </View>
  );
}

// ── Local styles for step-button symbols ──────────────────────────────────────
const btn = StyleSheet.create({
  symbol: {
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// WATER BOTTLE CARD
// ─────────────────────────────────────────────────────────────────────────────
function WaterBottleCard(props: VitalCardProps) {
  const {
    iconColor, label, value, unit, status, statusColor,
    fillColor, fillPct, vsGoalRight,
    onStepDown, onStepUp, stepDownDisabled, stepUpDisabled,
  } = props;

  const BOTTLE_H = 92;
  const fillAnim = useRef(new Animated.Value(fillPct)).current;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: fillPct,
      useNativeDriver: false,
      tension: 20,
      friction: 8,
    }).start();
  }, [fillPct, fillAnim]);

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, BOTTLE_H],
  });

  const textOnFill = fillPct > 55;

  return (
    <View style={wv.card}>
      {/* Header row */}
      <View style={wv.header}>
        <View style={wv.iconWrap}>
          <Feather name="droplet" size={18} color={iconColor} />
        </View>
        <Text style={wv.title}>{label}</Text>
        {vsGoalRight ? <Text style={wv.goal}>/ {vsGoalRight}</Text> : null}
      </View>

      {/* Bottle + steppers */}
      <View style={wv.bodyRow}>
        {/* Minus */}
        <TouchableOpacity
          style={[wv.stepBtn, stepDownDisabled && wv.stepBtnDis]}
          onPress={onStepDown} disabled={stepDownDisabled} hitSlop={8}
          accessibilityLabel="Decrease water">
          <Text style={wv.stepSymbol}>−</Text>
        </TouchableOpacity>

        {/* Bottle */}
        <View style={wv.bottleWrap}>
          {/* Cap */}
          <View style={wv.cap} />
          {/* Neck */}
          <View style={wv.neck} />
          {/* Body */}
          <View style={[wv.bottleBody, { height: BOTTLE_H }]}>
            {/* Animated fill rising from bottom */}
            <Animated.View
              style={[wv.fill, { height: fillHeight, backgroundColor: fillColor }]}
            />
            {/* Bubble decorations inside fill */}
            {fillPct > 15 && (
              <View style={wv.bubblesWrap} pointerEvents="none">
                <View style={[wv.bubble, { left: '28%', bottom: '30%', width: 5, height: 5 }]} />
                <View style={[wv.bubble, { left: '58%', bottom: '55%', width: 4, height: 4 }]} />
                <View style={[wv.bubble, { left: '42%', bottom: '20%', width: 3, height: 3 }]} />
              </View>
            )}
            {/* Value overlay centred in body */}
            <View style={wv.valueOverlay}>
              <Text style={[wv.valueText, { color: textOnFill ? '#fff' : C.text }]}>
                {value}
              </Text>
              <Text style={[wv.unitText, { color: textOnFill ? 'rgba(255,255,255,0.8)' : C.muted }]}>
                {unit}
              </Text>
            </View>
          </View>
          {/* % below bottle */}
          <Text style={wv.pctLabel}>{fillPct}%</Text>
        </View>

        {/* Plus */}
        <TouchableOpacity
          style={[wv.stepBtn, stepUpDisabled && wv.stepBtnDis]}
          onPress={onStepUp} disabled={stepUpDisabled} hitSlop={8}
          accessibilityLabel="Increase water">
          <Text style={wv.stepSymbol}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={wv.statusRow}>
        <View style={[wv.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[wv.statusText, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  );
}

const wv = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: C.diagBlue,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#9B3058', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  goal: { fontSize: 11, color: C.muted, fontWeight: '500' },

  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    marginBottom: 12,
  },

  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4 }
      : Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  stepBtnDis: { opacity: 0.28 },
  stepSymbol: { fontSize: 22, fontWeight: '500', color: C.text, lineHeight: 24, includeFontPadding: false },

  bottleWrap: { alignItems: 'center', gap: 0 },
  cap: {
    width: 22, height: 8,
    backgroundColor: C.primary,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  neck: {
    width: 32, height: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },
  bottleBody: {
    width: 68,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 14,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'flex-end',
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0, right: 0,
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
  },
  bubblesWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0 },
  bubble: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  valueOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    gap: 0,
  },
  valueText: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  unitText: { fontSize: 12, fontWeight: '600', marginTop: -2 },
  pctLabel: { fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 5, letterSpacing: 0.3 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600', flex: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP BED CARD
// ─────────────────────────────────────────────────────────────────────────────
function SleepBedCard(props: VitalCardProps) {
  const {
    iconColor, label, status, statusColor,
    fillColor, fillPct,
    sleepActualDisplay, sleepTargetDisplay, sleepTargetHours,
    onStepDown, onStepUp, stepDownDisabled, stepUpDisabled,
    value, unit,
  } = props;

  const sleptStr  = sleepActualDisplay ?? formatDecimalHoursAsClock(value, unit);
  const targetStr = sleepTargetDisplay
    ?? (sleepTargetHours != null ? formatTargetHours(sleepTargetHours) : '8 h');

  const BED_W_MAX = 200; // logical max width for fill calc
  const fillAnim  = useRef(new Animated.Value(fillPct)).current;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: fillPct,
      useNativeDriver: false,
      tension: 20,
      friction: 8,
    }).start();
  }, [fillPct, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={sv.card}>
      {/* Header */}
      <View style={sv.header}>
        <View style={sv.iconWrap}>
          <Feather name="moon" size={18} color={iconColor} />
        </View>
        <Text style={sv.title}>{label}</Text>
        <Text style={sv.goal}>{fillPct}% of target</Text>
      </View>

      {/* Bed illustration (top-down view) */}
      <View style={sv.bedFrame}>
        {/* Headboard */}
        <View style={sv.headboard} />

        {/* Mattress + blanket fill */}
        <View style={sv.mattress}>
          {/* Pillow */}
          <View style={sv.pillow} />
          {/* Blanket fill — slides in from left */}
          <View style={sv.blanketTrack}>
            <Animated.View style={[sv.blanket, { width: fillWidth, backgroundColor: fillColor }]} />
          </View>
        </View>

        {/* Footboard */}
        <View style={sv.footboard} />
      </View>

      {/* Stepper row */}
      <View style={sv.stepRow}>
        <TouchableOpacity
          style={[sv.stepBtn, stepDownDisabled && sv.stepBtnDis]}
          onPress={onStepDown} disabled={stepDownDisabled} hitSlop={8}
          accessibilityLabel="Decrease sleep">
          <Text style={sv.stepSymbol}>−</Text>
        </TouchableOpacity>

        <View style={sv.valueBlock}>
          <View style={sv.timeRow}>
            <Text style={sv.sleptTime}>{sleptStr}</Text>
            <Text style={sv.slash}> / </Text>
            <View>
              <Text style={sv.targetTime}>{targetStr}</Text>
              <Text style={sv.targetLbl}>target</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[sv.stepBtn, stepUpDisabled && sv.stepBtnDis]}
          onPress={onStepUp} disabled={stepUpDisabled} hitSlop={8}
          accessibilityLabel="Increase sleep">
          <Text style={sv.stepSymbol}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={sv.statusRow}>
        <View style={[sv.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[sv.statusText, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  );
}

const sv = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: C.diagPurpleTint,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  goal: { fontSize: 11, color: C.muted, fontWeight: '500' },

  // Bed frame — top-down view
  bedFrame: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: 14,
  },
  headboard: {
    width: 14,
    backgroundColor: 'rgba(109,40,217,0.35)',
  },
  mattress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    gap: 8,
    overflow: 'hidden',
  },
  pillow: {
    width: 28, height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    flexShrink: 0,
  },
  blanketTrack: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  blanket: {
    height: '100%',
    borderRadius: 8,
    opacity: 0.8,
  },
  footboard: {
    width: 10,
    backgroundColor: 'rgba(109,40,217,0.25)',
  },

  // Stepper
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4 }
      : Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  stepBtnDis: { opacity: 0.28 },
  stepSymbol: { fontSize: 22, fontWeight: '500', color: C.text, lineHeight: 24, includeFontPadding: false },

  valueBlock: { flex: 1, alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  sleptTime:  { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  slash:      { fontSize: 18, color: C.muted },
  targetTime: { fontSize: 17, fontWeight: '600', color: C.muted, letterSpacing: -0.3 },
  targetLbl:  { fontSize: 9, fontWeight: '600', color: C.muted, textAlign: 'center', letterSpacing: 0.3 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600', flex: 1 },
});
