import type { LesionFields } from '@/hooks/useLesions';

/** Normalized against model-server `CLASS_NAMES`; unknown labels default to Check. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

export type DerivedLesionStatus = LesionFields['status'];

// Raw HAM10000 short codes (notebook-trained: 'mel','bcc','akiec','bkl','df','nv','vasc')
// + display strings + legacy aliases. Backend may emit either raw or display.
const URGENT = new Set(
  [
    'melanoma', 'squamous cell carcinoma', 'basal cell carcinoma',
    'mel', 'bcc', 'basal_cell_carcinoma',
  ].map(norm),
);

const CHECK = new Set(
  [
    'actinic keratoses', 'actinic keratosis',
    'monkeypox', 'hfmd',
    'vascular lesions', 'vascular lesion',
    'akiec', 'vasc',
  ].map(norm),
);

const STABLE = new Set(
  [
    'acne', 'eczema',
    'benign keratosis-like lesions', 'benign keratosis',
    'chickenpox',
    'dermatofibroma',
    'healthy',
    'melanocytic nevi', 'melanocytic nevus',
    'bkl', 'df', 'nv',
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
