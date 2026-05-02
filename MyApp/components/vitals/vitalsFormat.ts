export const WATER_TARGET_L = 3;
export const SLEEP_TARGET_H = 7;

export function vitalsStatusFromTargetPct(pct: number): string {
  if (pct >= 100) return 'Amazing';
  if (pct >= 75) return 'Great';
  if (pct >= 50) return 'Good';
  if (pct >= 25) return 'Fair';
  return 'Low';
}

export function formatDecimalHoursAsClock(valueStr: string, unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u !== 'h' && u !== 'hr' && u !== 'hrs' && u !== 'hour' && u !== 'hours') {
    return `${valueStr} ${unit}`.trim();
  }
  const n = parseFloat(valueStr.replace(',', '.'));
  if (!Number.isFinite(n)) return `${valueStr} ${unit}`.trim();
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  if (m === 60) return `${h + 1}h`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTargetHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 60) return `${h + 1}h`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function vitalsGoalLeftAmount(value: string, unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u === 'l') return `${value} liters`;
  return `${value} ${unit}`.trim();
}

/**
 * Auto-unit display for water. Below 1 L, show ml (no decimals) so the
 * "+250 ml" buttons align with the readout. At/above 1 L, show L with up
 * to one decimal. Avoids the "0.6 L" rounding glitch when the user has
 * actually banked 550 ml.
 */
export function formatWaterValue(liters: number): { value: string; unit: 'L' | 'ml' } {
  if (!Number.isFinite(liters) || liters <= 0) return { value: '0', unit: 'ml' };
  if (liters < 1) {
    const ml = Math.round(liters * 1000);
    return { value: String(ml), unit: 'ml' };
  }
  const rounded = Math.round(liters * 10) / 10;
  return {
    value: rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1),
    unit: 'L',
  };
}

/**
 * Compact clock format for sleep — splits decimal hours into "Xh Ym".
 * Returns { value, unit } so callers (VitalRingCard) can keep their
 * value/unit layout. The "unit" is empty because the value carries it.
 */
export function formatSleepValue(hours: number): { value: string; unit: '' | 'h' } {
  if (!Number.isFinite(hours) || hours <= 0) return { value: '0', unit: 'h' };
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 60) return { value: `${h + 1}`, unit: 'h' };
  if (m === 0)  return { value: `${h}`,     unit: 'h' };
  return { value: `${h}h ${m}m`, unit: '' };
}
