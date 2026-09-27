import { configureFonts, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import type { Language } from '@shared/constants';

export const palette = {
  terracotta: '#C65D3A',
  terracottaDark: '#9E4527',
  olive: '#6F7D45',
  oliveDark: '#55602F',
  deepBlue: '#173B57',
  cream: '#FFF8ED',
  beige: '#EDE0CF',
  text: '#252525',
  muted: '#5E5A55',
  white: '#FFFFFF',
  danger: '#B3261E',
  warning: '#8A5A00',
  success: '#2E6B34',
  border: '#DCCDBA',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
/** Minimum touch target (dp) per accessibility guidelines. */
export const MIN_TOUCH = 44;

export const FONT_FAMILIES = {
  ar: { regular: 'NotoSansArabic_400Regular', medium: 'NotoSansArabic_500Medium', bold: 'NotoSansArabic_700Bold' },
  fr: { regular: 'Inter_400Regular', medium: 'Inter_600SemiBold', bold: 'Inter_700Bold' },
} as const;

export function buildTheme(language: Language): MD3Theme {
  const families = FONT_FAMILIES[language];
  const fonts = configureFonts({
    config: {
      fontFamily: families.regular,
      ...Object.fromEntries(
        [
          'displayLarge',
          'displayMedium',
          'displaySmall',
          'headlineLarge',
          'headlineMedium',
          'headlineSmall',
          'titleLarge',
        ].map((k) => [k, { fontFamily: families.bold, fontWeight: '700' }]),
      ),
      ...Object.fromEntries(
        ['titleMedium', 'titleSmall', 'labelLarge'].map((k) => [k, { fontFamily: families.medium, fontWeight: '600' }]),
      ),
    } as never,
  });
  return {
    ...MD3LightTheme,
    roundness: 3,
    fonts,
    colors: {
      ...MD3LightTheme.colors,
      primary: palette.terracotta,
      onPrimary: palette.white,
      primaryContainer: '#F8DCCF',
      onPrimaryContainer: '#3B1406',
      secondary: palette.olive,
      onSecondary: palette.white,
      secondaryContainer: '#E3E8CF',
      onSecondaryContainer: '#1D2208',
      tertiary: palette.deepBlue,
      onTertiary: palette.white,
      tertiaryContainer: '#D3E3F1',
      onTertiaryContainer: '#051D2F',
      background: palette.cream,
      onBackground: palette.text,
      surface: palette.white,
      onSurface: palette.text,
      surfaceVariant: palette.beige,
      onSurfaceVariant: palette.muted,
      outline: '#8F8272',
      outlineVariant: palette.border,
      error: palette.danger,
      elevation: {
        ...MD3LightTheme.colors.elevation,
        level1: '#FFF9F2',
        level2: '#FCF1E4',
      },
    },
  };
}
