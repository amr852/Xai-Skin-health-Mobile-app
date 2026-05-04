// ─────────────────────────────────────────────────────────────────────────────
// Frontend input validators — auth & profile fields.
//
// These are the first line of defense, NOT the only one. The backend MUST
// re-validate every field. The goals here are:
//   1. Catch obvious malformed input before a network round-trip.
//   2. Give the user a precise, immediate error message.
//   3. Cap string lengths so a pathological input cannot turn into a slow-
//      hash bcrypt or an oversized payload on the wire.
//
// We deliberately do not encode passwords or hash anything client-side —
// HTTPS + the server's hash function is the contract.
// ─────────────────────────────────────────────────────────────────────────────

// RFC 5321 puts the SMTP envelope limit at 254 chars; the local-part can be
// up to 64 chars. We cap at 254 to match deliverable email addresses.
export const EMAIL_MAX = 254;

// 128 chars is generous for a password and keeps bcrypt-style hashing fast.
// Anything longer is almost certainly a paste accident or an attack vector.
export const PASSWORD_MAX = 128;
export const PASSWORD_MIN = 6;

export const NAME_MAX = 50;

// Pragmatic email regex — covers >99% of real addresses without overfitting
// on RFC edge cases that browsers and servers reject anyway. We keep it
// tight enough to reject obvious nonsense ("foo", "@bar", "a@b") but lenient
// enough to accept tag-addresses ("a+tag@b.co"), subdomains, and IDN-friendly
// TLDs (after IDNA decoding, which the platform handles).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Disallow ASCII control characters (0x00–0x1F, 0x7F) in user-supplied names.
// These never appear in a legitimate name and are a classic injection vector
// when downstream code logs or renders the field unsanitised.
const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/;

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/** Trim, lowercase, and validate an email address. Returns the normalised value or an error. */
export function validateEmail(raw: string): ValidationResult {
  const value = raw.trim().toLowerCase();
  if (!value) return { ok: false, error: 'Please enter your email.' };
  if (value.length > EMAIL_MAX) return { ok: false, error: 'That email is too long.' };
  if (!EMAIL_RE.test(value)) return { ok: false, error: 'That doesn’t look like a valid email address.' };
  return { ok: true, value };
}

/**
 * Validate a password. We do NOT trim — leading/trailing whitespace can be
 * intentional in a password — but we DO cap the length and enforce a minimum.
 */
export function validatePassword(raw: string): ValidationResult {
  if (!raw) return { ok: false, error: 'Please enter a password.' };
  if (raw.length < PASSWORD_MIN) return { ok: false, error: `Password must be at least ${PASSWORD_MIN} characters.` };
  if (raw.length > PASSWORD_MAX) return { ok: false, error: 'Password is too long.' };
  return { ok: true, value: raw };
}

/** Validate a human name (first or last). Trims, caps length, blocks control chars. */
export function validateName(raw: string, label = 'Name'): ValidationResult {
  const value = raw.trim();
  if (!value) return { ok: false, error: `${label} is required.` };
  if (value.length > NAME_MAX) return { ok: false, error: `${label} is too long.` };
  if (CONTROL_CHARS_RE.test(value)) return { ok: false, error: `${label} contains invalid characters.` };
  return { ok: true, value };
}
