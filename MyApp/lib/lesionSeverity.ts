import type { LesionFields } from '@/hooks/useLesions';

/** Normalized against model-server `CLASS_NAMES`; unknown labels default to Check. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

export type DerivedLesionStatus = LesionFields['status'];

const URGENT = new Set(
  ['melanoma', 'squamous cell carcinoma', 'basal cell carcinoma'].map(norm),
);

const CHECK = new Set(
  [
    'actinic keratoses',
    'monkeypox',
    'hfmd',
    'vascular lesions',
  ].map(norm),
);

const STABLE = new Set(
  [
    'acne',
    'eczema',
    'benign keratosis-like lesions',
    'chickenpox',
    'dermatofibroma',
    'healthy',
    'melanocytic nevi',
  ].map(norm),
);

/** Derive triage status from classifier label (aligned with CLASS_NAMES in model-server/app.py). */
export function statusFromPrediction(label: string): DerivedLesionStatus {
  const k = norm(label);
  if (URGENT.has(k)) return 'Urgent';
  if (STABLE.has(k)) return 'Stable';
  if (CHECK.has(k)) return 'Check';
  /** Numeric fallback when checkpoint mismatches CLASS_NAMES */
  if (/^class_\d+$/u.test(k) || /^-?\d+$/u.test(k)) return 'Check';
  return 'Check';
}
