/**
 * validation.ts — Centralized Input Sanitizers and Validators
 */

/**
 * Sanitize numeric-only 10-digit mobile number input
 */
export function sanitizeMobile(input: string): string {
  return input.replace(/[^0-9]/g, '').slice(0, 10);
}

/**
 * Validate that an input is a valid 10-digit Indian mobile number
 */
export function isValidMobile(phone: string): boolean {
  const digits = sanitizeMobile(phone);
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

/**
 * Sanitize a 4-digit secret PIN input
 */
export function sanitizePin(input: string, maxLen = 4): string {
  return input.replace(/[^0-9]/g, '').slice(0, maxLen);
}

