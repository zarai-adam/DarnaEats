import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Checkbox, HelperText, Text } from 'react-native-paper';
import { Screen } from '@/components';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthProvider';
import { api } from '@/services/firebase/callables';
import { useSettingsStore } from '@/store/settingsStore';
import { errorMessage } from '@/utils/errors';

export default function TermsScreen() {
  const { t } = useTranslation();
  const { refresh, profile } = useAuth();
  const language = useSettingsStore((s) => s.language) ?? 'ar';
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.ensureUserProfile({ acceptedTermsVersion: env.termsVersion, preferredLanguage: language });
      await refresh();
      // Brand-new accounts choose how they want to use the app.
      router.replace(profile?.acceptedTermsVersion ? '/' : '/role');
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="titleMedium" accessibilityRole="header">
        {t('legal.termsSummaryTitle')}
      </Text>
      {(['legal.point1', 'legal.point2', 'legal.point3', 'legal.point4', 'legal.point5'] as const).map((key) => (
        <Text key={key} variant="bodyMedium">
          • {t(key)}
        </Text>
      ))}
      <Button mode="text" onPress={() => router.push('/legal')}>
        {t('legal.readFull')}
      </Button>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Checkbox.Android
          status={accepted ? 'checked' : 'unchecked'}
          onPress={() => setAccepted(!accepted)}
          accessibilityLabel={t('legal.accept')}
        />
        <Text variant="bodyMedium" style={{ flex: 1 }} onPress={() => setAccepted(!accepted)}>
          {t('legal.accept')}
        </Text>
      </View>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained"
        disabled={!accepted || busy}
        loading={busy}
        onPress={accept}
        contentStyle={{ minHeight: 48 }}
      >
        {t('common.continue')}
      </Button>
    </Screen>
  );
}
