import { getLocales } from 'expo-localization';
import i18n from 'i18next';
/* eslint-disable import/no-named-as-default-member -- i18next's documented default-instance API */
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import type { Language } from '@shared/constants';
import ar from '../../locales/ar/common.json';
import fr from '../../locales/fr/common.json';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['ar', 'fr'];
export const RTL_LANGUAGES: readonly Language[] = ['ar'];

export function isRtlLanguage(language: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(language);
}

export function detectDeviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? 'ar';
  return code === 'fr' ? 'fr' : 'ar';
}

export function initI18n(language: Language) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: { ar: { common: ar }, fr: { common: fr } },
      lng: language,
      fallbackLng: 'fr',
      defaultNS: 'common',
      ns: ['common'],
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  applyDocumentDirection(language);
  return i18n;
}

/** On web, direction is controlled by the document; no reload needed. */
function applyDocumentDirection(language: Language) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRtlLanguage(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }
}

/**
 * Aligns React Native's layout direction with the language. Returns true when
 * a reload is required for the change to take effect (native only).
 */
export function syncLayoutDirection(language: Language): boolean {
  if (Platform.OS === 'web') return false;
  const shouldBeRtl = isRtlLanguage(language);
  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.forceRTL(shouldBeRtl);
    return true;
  }
  return false;
}

export default i18n;
