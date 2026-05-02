import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C, FontFamily, FontSize, Radius, Space, Shadow } from '@/constants/theme';
import { useSunProtection } from '@/hooks/useSunProtection';
import { SprayCan } from 'lucide-react-native';
import { StatusArc } from '@/components/decor/StatusArc';

const REAPPLY_INTERVAL_MS = 2 * 60 * 60 * 1000;

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'Not applied today';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Applied just now';
  if (mins < 60) return `Applied ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 5 && rem > 0) return `Applied ${hrs}h ${rem}m ago`;
  return `Applied ${hrs}h ago`;
}

function formatUntil(ms: number): string {
  if (ms <= 0) return 'Reapply now';
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `Reapply in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `Reapply in ${hrs}h`;
  return `Reapply in ${hrs}h ${rem}m`;
}

export function SunProtectionCard() {
  const { lastAppliedISO, logApplication } = useSunProtection();

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleLog = () => {
    logApplication();
  };

  // Status colors are slate-ink, NOT traffic-light. We removed the green "protected"
  // bar entirely — the medical context already conveys urgency via the action label.
  const { status, statusColor, needsReapply, gaugePct, gaugeLabel } = useMemo(() => {
    if (!lastAppliedISO) {
      return {
        status: 'Unprotected',
        statusColor: C.urgentText, // urgent stays red — this is a *medical* alert
        needsReapply: true,
        gaugePct: 0,
        gaugeLabel: 'Apply sunscreen to start',
      };
    }
    const elapsed = Date.now() - new Date(lastAppliedISO).getTime();
    const remaining = REAPPLY_INTERVAL_MS - elapsed;
    const pct = Math.max(0, Math.min(100, Math.round((elapsed / REAPPLY_INTERVAL_MS) * 100)));
    if (remaining <= 0) {
      return {
        status: 'Time to reapply',
        statusColor: C.checkText, // amber — soft prompt
        needsReapply: true,
        gaugePct: 100,
        gaugeLabel: 'Reapply now',
      };
    }
    return {
      status: 'Protected',
      statusColor: C.text, // *slate-ink, not green* — quiet confirmation
      needsReapply: false,
      gaugePct: pct,
      gaugeLabel: formatUntil(remaining),
    };
  }, [lastAppliedISO]);

  // The green "Stable" status arc was the source of the unwanted green bar — show
  // the arc ONLY when there's an actual alert state (needsReapply). Protected = quiet.
  const showArc = needsReapply;
  const arcStatus = lastAppliedISO ? 'Check' : 'Urgent';

  return (
    <View style={s.card}>
      {showArc && <StatusArc status={arcStatus} edge="top" />}
      <View style={s.headRow}>
        <View style={s.iconBg}>
          <SprayCan size={22} color={C.amberFill} strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Sun Protection</Text>
          <Text style={s.sub}>{formatTimeAgo(lastAppliedISO)}</Text>
        </View>
      </View>

      {/* Minimal dose-progress: thin slate track + rose progress + travelling dot. */}
      {/* Replaces the prominent green/amber bar with something quieter and more clinical. */}
      <View style={s.gaugeWrap}>
        <View style={s.minimalTrack}>
          <View
            style={[
              s.minimalFill,
              {
                width: `${gaugePct}%`,
                backgroundColor: needsReapply ? C.checkText : C.primary,
              },
            ]}
          />
          <View
            style={[
              s.minimalDot,
              {
                left: `${Math.min(100, Math.max(0, gaugePct))}%`,
                backgroundColor: needsReapply ? C.checkText : C.primary,
              },
            ]}
          />
        </View>
        <View style={s.gaugeLabelRow}>
          <View style={s.statusRow}>
            <Text style={[s.statusTxt, { color: statusColor }]}>{status}</Text>
          </View>
          <Text style={s.gaugeLabel}>{gaugeLabel}</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          s.cta,
          needsReapply ? { backgroundColor: C.primary } : { backgroundColor: C.surfaceAlt },
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handleLog}
        accessibilityRole="button"
        accessibilityLabel="Log sunscreen application">
        <Feather
          name={needsReapply ? 'plus-circle' : 'check-circle'}
          size={14}
          color={needsReapply ? '#fff' : C.text}
        />
        <Text
          style={[
            s.ctaTxt,
            { color: needsReapply ? '#fff' : C.text },
          ]}>
          {needsReapply ? 'Log application' : 'Log another'}
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: Space[5],
    marginBottom: Space[5],
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Space[4],
    overflow: 'hidden',
    ...Shadow.xs,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    marginBottom: Space[3],
  },
  iconBg: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: C.amberLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayBold,
    color: C.text,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: FontSize.xs + 1,
    fontFamily: FontFamily.body,
    color: C.muted,
    marginTop: 2,
  },
  gaugeWrap: { marginBottom: Space[3] },
  // Minimal track — 3 px hairline, no green
  minimalTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.surfaceAlt,
    position: 'relative',
    marginVertical: 6,
  },
  minimalFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Travelling dot — sits at the leading edge of the fill
  minimalDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: -3.5,
    marginLeft: -5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  // (Legacy keys kept so other selectors don't break — unused now)
  gaugeTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: C.surfaceAlt,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 99,
  },
  gaugeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.2,
  },
  gaugeLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemibold,
    color: C.muted,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  ctaTxt: {
    fontSize: FontSize.xs + 2,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 0.3,
  },
});
