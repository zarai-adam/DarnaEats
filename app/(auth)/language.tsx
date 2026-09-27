import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Language } from '@shared/constants';
import { initI18n, syncLayoutDirection } from '@/localization/i18n';
import { reloadApp } from '@/localization/reload';
import { useSettingsStore } from '@/store/settingsStore';
import { palette, spacing } from '@/theme';

/**
 * First-run language choice. Labels are intentionally shown in both languages
 * because the user has not chosen one yet.
 */
export default function LanguageScreen() {
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const choose = (language: Language) => {
    setLanguage(language);
    initI18n(language);
    if (syncLayoutDirection(language)) {
      void reloadApp();
      return;
    }
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.brand}>
        <Text variant="displaySmall" style={styles.logo} accessibilityRole="header">
          Darna Eats · دارنا
        </Text>
        <Text variant="titleMedium" style={styles.tagline}>
          أكل الدار · Cuisine de la maison
        </Text>
      </View>
      <View style={styles.actions}>
        <Text variant="titleMedium" style={styles.center}>
          اختر اللغة · Choisissez la langue
        </Text>
        <Button
          mode="contained"
          onPress={() => choose('ar')}
          contentStyle={styles.button}
          labelStyle={styles.label}
          accessibilityLabel="العربية"
        >
          العربية
        </Button>
        <Button
          mode="outlined"
          onPress={() => choose('fr')}
          contentStyle={styles.button}
          labelStyle={styles.label}
          accessibilityLabel="Français"
        >
          Français
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream, padding: spacing.xl, justifyContent: 'space-between' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  logo: { color: palette.terracotta, textAlign: 'center' },
  tagline: { color: palette.olive, textAlign: 'center' },
  actions: { gap: spacing.md },
  center: { textAlign: 'center' },
  button: { minHeight: 52 },
  label: { fontSize: 18 },
});
