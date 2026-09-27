/**
 * Text normalisation used to build and query search tokens.
 * Handles Arabic (diacritics, alef/yaa/taa-marbuta variants, tatweel) and
 * French (accents, ligatures) so "Brik", "brick" and "بريك" style variations
 * collapse to comparable tokens.
 */

const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

export function normalizeArabic(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[آأإٱ]/g, 'ا') // alef variants → ا
    .replace(/ى/g, 'ي') // alef maqsura → ي
    .replace(/ة/g, 'ه') // taa marbuta → ه
    .replace(/ؤ/g, 'و') // waw hamza → و
    .replace(/ئ/g, 'ي'); // yaa hamza → ي
}

export function normalizeLatin(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae');
}

export function normalizeText(input: string): string {
  return normalizeLatin(normalizeArabic(input.toLowerCase()))
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  return normalized.split(' ').filter((word) => word.length >= 2);
}

const MIN_PREFIX = 2;
const MAX_PREFIX = 15;

/**
 * Builds a de-duplicated list of word prefixes suitable for Firestore
 * `array-contains` queries. Capped to keep documents small.
 */
export function buildSearchTokens(parts: readonly (string | null | undefined)[], max = 200): string[] {
  const tokens = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const word of tokenize(part)) {
      const limit = Math.min(word.length, MAX_PREFIX);
      for (let i = MIN_PREFIX; i <= limit; i += 1) {
        tokens.add(word.slice(0, i));
        if (tokens.size >= max) return [...tokens];
      }
    }
  }
  return [...tokens];
}

export function slugify(input: string): string {
  return normalizeLatin(input.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
