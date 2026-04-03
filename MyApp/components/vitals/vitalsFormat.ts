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
