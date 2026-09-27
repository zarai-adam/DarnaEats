import type { Language } from '@shared/constants';

/**
 * Prices are always shown with Western digits and "DT" for consistency across
 * Arabic and French (Tunisian convention), with 3 decimals only when needed.
 */
export function formatPrice(amount: number, language: Language): string {
  const hasMillimes = Math.round(amount * 1000) % 1000 !== 0;
  const value = amount.toLocaleString('fr-TN', {
    minimumFractionDigits: hasMillimes ? 3 : 0,
    maximumFractionDigits: 3,
  });
  return language === 'ar' ? `${value} د.ت` : `${value} DT`;
}

export function formatDate(ms: number | null | undefined, language: Language, withTime = false): string {
  if (!ms) return '';
  const locale = language === 'ar' ? 'ar-TN-u-nu-latn' : 'fr-TN';
  try {
    return new Date(ms).toLocaleString(locale, {
      timeZone: 'Africa/Tunis',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  } catch {
    return new Date(ms)
      .toISOString()
      .slice(0, withTime ? 16 : 10)
      .replace('T', ' ');
  }
}

export function formatDateKey(dateKey: string, language: Language): string {
  return formatDate(Date.parse(`${dateKey}T12:00:00Z`), language);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Short random id used for idempotency keys. */
export function randomId(length = 20): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
