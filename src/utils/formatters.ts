/**
 * formatters.ts — Centralized Currency, Date, and Time Formatters
 * Enforces consistent INR currency formatting and Indian locale date/time representation across the app.
 */

/**
 * Format any numeric value as Indian Rupees (INR)
 * @example formatINR(1500) -> "₹1,500"
 * @example formatINR(1500.5, { decimals: 2 }) -> "₹1,500.50"
 */
export function formatINR(
  amount: number,
  options?: { decimals?: number; round?: boolean }
): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  
  if (options?.round) {
    return '₹' + Math.round(safeAmount).toLocaleString('en-IN');
  }

  const maxDecimals = options?.decimals !== undefined ? options.decimals : 2;
  return '₹' + safeAmount.toLocaleString('en-IN', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: options?.decimals !== undefined ? options.decimals : 0,
  });
}

/**
 * Get today's ISO date string in YYYY-MM-DD format
 * @example getTodayISODate() -> "2026-09-23"
 */
export function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format a Date or timestamp string into localized Indian date text
 * @example formatDate(new Date()) -> "23 सित॰ 2026"
 */
export function formatDate(
  date: string | Date | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  return d.toLocaleDateString('hi-IN', options || defaultOptions);
}

/**
 * Format a Date or timestamp string into localized 12-hour time format
 * @example formatTime(new Date()) -> "07:30 PM"
 */
export function formatTime(date: string | Date | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString('hi-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

