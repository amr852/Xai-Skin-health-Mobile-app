import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C, FontSize, Radius, Space } from '@/constants/theme';
import { useSunProtection } from '@/hooks/useSunProtection';

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

  const { status, statusColor, needsReapply, gaugePct, gaugeLabel } = useMemo(() => {
    if (!lastAppliedISO) {
      return {
        status: 'Unprotected',
        statusColor: C.urgentText,
        needsReapply: true,
        gaugePct: 100,
        gaugeLabel: 'Apply sunscreen to start',
      };
    }
    const elapsed = Date.now() - new Date(lastAppliedISO).getTime();
    const remaining = REAPPLY_INTERVAL_MS - elapsed;
    const pct = Math.max(0, Math.min(100, Math.round((elapsed / REAPPLY_INTERVAL_MS) * 100)));
    if (remaining <= 0) {
      return {
        status: 'Time to reapply',
        statusColor: C.checkText,
        needsReapply: true,
        gaugePct: 100,
        gaugeLabel: 'Reapply now',
      };
    }
    return {
      status: 'Protected',
      statusColor: C.stableText,
      needsReapply: false,
      gaugePct: pct,
      gaugeLabel: formatUntil(remaining),
    };
  }, [lastAppliedISO]);

  return (
    <View style={s.card}>
      <View style={s.headRow}>
        <View style={s.iconBg}>
          <Feather name="sun" size={18} color={C.amberFill} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Sun Protection</Text>
          <Text style={s.sub}>{formatTimeAgo(lastAppliedISO)}</Text>
        </View>
      </View>

      <View style={s.gaugeWrap}>
        <View style={s.gaugeTrack}>
          <View
            style={[
              s.gaugeFill,
              {
                width: `${gaugePct}%`,
                backgroundColor: needsReapply ? C.amberFill : C.stableText,
              },
            ]}
          />
        </View>
        <View style={s.gaugeLabelRow}>
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: statusColor }]} />
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
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    marginBottom: Space[3],
  },
  iconBg: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: C.amberLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.base, fontWeight: '800', color: C.text, letterSpacing: -0.2,
  },
  sub: { fontSize: FontSize.xs + 1, color: C.muted, marginTop: 1 },
  gaugeWrap: { marginBottom: Space[3] },
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
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: FontSize.xs, fontWeight: '700' },
  gaugeLabel: { fontSize: FontSize.xs, color: C.muted, fontWeight: '600' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  ctaTxt: { fontSize: FontSize.xs + 2, fontWeight: '700' },
});
