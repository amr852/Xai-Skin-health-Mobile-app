import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';
import {
  formatDecimalHoursAsClock,
  formatTargetHours,
  vitalsGoalLeftAmount,
} from '@/components/vitals/vitalsFormat';
import { vitalStyles as s } from '@/components/vitals/vitalStyles';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export type VitalLayout = 'wave' | 'segments' | 'panel' | 'sleepWave';

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
  onStepDown?: () => void;
  onStepUp?: () => void;
  stepDownDisabled?: boolean;
  stepUpDisabled?: boolean;
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

  if (layout === 'sleepWave') {
    return (
      <View style={s.vBoxSleepWave}>
        <View style={s.vWaveHead}>
          <View style={s.vWhiteIconCircle}>
            <Feather name={icon} size={16} color={iconColor} />
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
                <Feather name="minus" size={16} color={C.diagLine} />
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
                <Feather name="plus" size={16} color={C.diagLine} />
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
                <Feather name="minus" size={16} color={C.diagLine} />
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
                <Feather name="plus" size={16} color={C.diagLine} />
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
        <View style={[s.vBarBgSleepWave, { backgroundColor: 'rgba(96, 80, 184, 0.20)' }]}>
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
            <Feather name={icon} size={16} color={iconColor} />
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
        <View style={[s.vBarBgWave, { backgroundColor: 'rgba(30, 122, 174, 0.2)' }]}>
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
            <Feather name={icon} size={17} color={iconColor} />
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
                    ? { backgroundColor: C.diagYellowDeep }
                    : { backgroundColor: C.diagYellowPale },
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
          <Feather name={icon} size={28} color={iconColor} />
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
