import { C } from '@/constants/theme';

export function uviToDisplay(uv: number): string {
  if (!Number.isFinite(uv) || uv < 0) return '—';
  const n = Math.round(uv);
  return String(n);
}

export function uviToRiskMeta(uv: number): { label: string; color: string } {
  if (!Number.isFinite(uv) || uv < 0) {
    return { label: 'Unavailable', color: C.muted };
  }
  if (uv < 3) return { label: 'Low', color: C.stableText };
  if (uv < 6) return { label: 'Moderate', color: C.amber };
  if (uv < 8) return { label: 'High', color: '#C55A08' };
  if (uv < 11) return { label: 'Very high', color: '#C04030' };
  return { label: 'Extreme', color: '#6B2D8A' };
}
