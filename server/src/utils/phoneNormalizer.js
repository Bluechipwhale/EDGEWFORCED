// ==============================================================================
// EDGEWFORCE - PHONE & EMAIL NORMALIZATION UTILITY
// Handles Nigerian phone numbers (080..., 081..., 070..., 090..., +234...)
// and international E.164 formats, plus email normalization.
// ==============================================================================

/**
 * Normalizes a phone number to standard E.164 format (+234...).
 * Supports Nigerian local 11-digit numbers, 10-digit numbers, and international format.
 */
export function normalizePhone(input) {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Strip all non-digit characters except leading plus
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  // Check Nigerian prefixes
  if (digits.startsWith('234') && digits.length === 13) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+234${digits}`;
  }

  // Fallback if already has country code
  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/**
 * Validates whether an identifier string is an email address.
 */
export function isEmail(input) {
  if (!input) return false;
  const str = String(input).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/**
 * Normalizes email address to trimmed lowercase.
 */
export function normalizeEmail(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase();
  return str || null;
}
