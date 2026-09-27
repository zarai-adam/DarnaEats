import { router } from 'expo-router';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, List, RadioButton, Text, TextInput } from 'react-native-paper';
import type { Language } from '@shared/constants';
import { Screen, SectionHeader } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { initI18n, syncLayoutDirection } from '@/localization/i18n';
import { reloadApp } from '@/localization/reload';
import { useLocalized } from '@/localization/useLocalized';
import { db } from '@/services/firebase/app';
import { registerForPushNotifications } from '@/services/notifications';
import { useSettingsStore } from '@/store/settingsStore';
import { errorMessage } from '@/utils/errors';
import { palette, spacing } from '@/theme';

export default function SettingsScreen() {
  const { t, language } = useLocalized();
  const { user, profile, refresh } = useAuth();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeLanguage = async (next: Language) => {
    if (next === language) return;
    setLanguage(next);
    if (user)
      await updateDoc(doc(db, 'users', user.uid), { preferredLanguage: next, updatedAt: serverTimestamp() }).catch(
        () => undefined,
      );
    initI18n(next);
    if (syncLayoutDirection(next)) await reloadApp();
  };

  const saveName = async () => {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name.trim().slice(0, 80),
        updatedAt: serverTimestamp(),
      });
      await refresh();
      setMessage(t('common.saved'));
    } catch (e) {
      setMessage(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title={t('settings.language')} />
      <RadioButton.Group value={language} onValueChange={(v) => void changeLanguage(v as Language)}>
        <RadioButton.Item label="العربية" value="ar" style={styles.item} />
        <RadioButton.Item label="Français" value="fr" style={styles.item} />
      </RadioButton.Group>
      <Text variant="bodySmall" style={styles.muted}>
        {t('settings.languageNote')}
      </Text>

      <SectionHeader title={t('settings.profile')} />
      <TextInput
        mode="outlined"
        label={t('auth.displayName')}
        value={name}
        onChangeText={setName}
        maxLength={80}
        style={styles.input}
      />
      <Button mode="contained-tonal" onPress={saveName} loading={busy} disabled={busy || name.trim().length < 2}>
        {t('common.save')}
      </Button>
      {message ? <HelperText type="info">{message}</HelperText> : null}
      {!user?.phoneNumber ? (
        <Button icon="phone-check" onPress={() => router.push({ pathname: '/phone', params: { mode: 'link' } })}>
          {t('settings.verifyPhone')}
        </Button>
      ) : (
        <Text variant="bodyMedium">{t('settings.phoneVerified', { phone: user.phoneNumber })}</Text>
      )}

      <SectionHeader title={t('settings.notifications')} />
      <Button
        icon="bell-ring-outline"
        onPress={() =>
          user && void registerForPushNotifications(user.uid).then((r) => setMessage(t(`settings.push.${r}`)))
        }
      >
        {t('settings.enablePush')}
      </Button>

      <SectionHeader title={t('settings.about')} />
      <View>
        <List.Item
          title={t('legal.title')}
          onPress={() => router.push('/legal')}
          style={styles.item}
          left={(p) => <List.Icon {...p} icon="file-document-outline" />}
        />
        <Text variant="bodySmall" style={styles.muted}>
          Darna Eats · v1.0.0
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { backgroundColor: palette.white, borderRadius: 12, marginBottom: spacing.xs, minHeight: 48 },
  input: { backgroundColor: palette.white },
  muted: { color: palette.muted },
});
