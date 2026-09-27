import { useTranslation } from 'react-i18next';
import type { Language } from '@shared/constants';

type Localizable = object;

/**
 * Picks the Arabic or French variant of a bilingual field, e.g.
 * `pick(dish, 'name')` reads `nameAr` / `nameFr`, falling back to the other
 * language if one is empty (mixed-language content is common).
 */
export function pickLocalized(entity: Localizable | null | undefined, base: string, language: Language): string {
  if (!entity) return '';
  const record = entity as Record<string, unknown>;
  const primary = record[`${base}${language === 'ar' ? 'Ar' : 'Fr'}`];
  const secondary = record[`${base}${language === 'ar' ? 'Fr' : 'Ar'}`];
  if (typeof primary === 'string' && primary.trim()) return primary;
  return typeof secondary === 'string' ? secondary : '';
}

export function useLocalized() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'ar' ? 'ar' : 'fr') as Language;
  return {
    t,
    language,
    isRTL: language === 'ar',
    pick: (entity: Localizable | null | undefined, base: string) => pickLocalized(entity, base, language),
    pickSnapshot: (snapshot: { ar: string; fr: string } | null | undefined) =>
      snapshot ? (language === 'ar' ? snapshot.ar || snapshot.fr : snapshot.fr || snapshot.ar) : '',
  };
}
