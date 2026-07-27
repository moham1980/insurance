import { format as dfFormat } from 'date-fns-jalali';

/**
 * Format currency in Persian (Iranian Rial).
 * @example formatCurrency(1250000, 'IRR') // "۱٬۲۵۰٬۰۰۰ ریال"
 */
export function formatCurrency(value: number, currency: 'IRR' | 'IRT' = 'IRR'): string {
  const formatter = new Intl.NumberFormat('fa-IR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const symbol = currency === 'IRT' ? 'تومان' : 'ریال';
  return `${formatter.format(value)} ${symbol}`;
}

/**
 * Format number with Persian digits and thousand separators.
 * @example formatNumber(1234567) // "۱٬۲۳۴٬۵۶۷"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}

/**
 * Format Jalali (Persian) date.
 * @example formatPersianDate(new Date()) // "۱۴۰۳/۰۳/۰۶"
 */
export function formatPersianDate(date: Date | string | number, pattern = 'yyyy/MM/dd'): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return dfFormat(d, pattern);
}

/**
 * Format Persian date with time.
 */
export function formatPersianDateTime(date: Date | string | number): string {
  return formatPersianDate(date, 'yyyy/MM/dd HH:mm');
}
