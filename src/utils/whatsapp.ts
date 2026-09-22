/**
 * whatsapp.ts — Centralized WhatsApp Message URL Builder & Dispatcher
 * Eliminates duplicate phone cleaning, country-code appending, and window.open logic.
 */

/**
 * Clean and normalize a 10-digit Indian phone number
 * Strips out spaces, dashes, parentheses, and leading 0s or +91 prefixes.
 */
export function normalizeIndianPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Build a valid WhatsApp wa.me URL with pre-filled text
 */
export function buildWhatsAppUrl(phone?: string, text?: string): string {
  const clean = normalizeIndianPhone(phone);
  const encoded = text ? encodeURIComponent(text) : '';

  if (clean.length >= 10) {
    return encoded
      ? `https://wa.me/91${clean}?text=${encoded}`
      : `https://wa.me/91${clean}`;
  }

  return encoded ? `https://wa.me/?text=${encoded}` : 'https://wa.me/';
}

/**
 * Open a WhatsApp chat window in a new tab with safety attributes
 */
export function openWhatsApp(phone?: string, text?: string): void {
  if (typeof window === 'undefined') return;
  const url = buildWhatsAppUrl(phone, text);
  window.open(url, '_blank', 'noopener,noreferrer');
}

