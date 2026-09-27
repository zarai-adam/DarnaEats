import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, List, Text, TextInput } from 'react-native-paper';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components';
import { useSaveCatalogEntity } from '@/features/admin/api';
import { useAppSettings } from '@/features/catalog/api';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, spacing } from '@/theme';

/** Key/value marketplace settings (public, non-secret values only). */
export default function AppSettingsScreen() {
  const { t, language } = useLocalized();
  const settings = useAppSettings();
  const save = useSaveCatalogEntity();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (settings.isLoading) return <LoadingState />;
  if (!settings.data) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;

  const submit = async () => {
    setError(null);
    try {
      const parsed =
        value === 'true'
          ? true
          : value === 'false'
            ? false
            : value.trim() !== '' && !Number.isNaN(Number(value))
              ? Number(value)
              : value;
      await save.mutateAsync({
        collection: 'appSettings',
        id: key.trim().replace(/[^A-Za-z0-9_-]/g, '_'),
        data: { key: key.trim(), value: parsed },
      });
      setKey('');
      setValue('');
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };

  return (
    <Screen scroll>
      <Text variant="bodySmall" style={styles.muted}>
        {t('admin.settingsNote')}
      </Text>
      {settings.data.map((s) => (
        <List.Item
          key={s.id}
          title={s.key}
          description={`${String(s.value)} · ${formatDate(s.updatedAt, language, true)}`}
          onPress={() => {
            setKey(s.key);
            setValue(String(s.value));
          }}
          style={styles.item}
        />
      ))}
      <SectionHeader title={t('admin.editSetting')} />
      <View style={{ gap: spacing.sm }}>
        <TextInput
          mode="outlined"
          label={t('admin.key')}
          value={key}
          onChangeText={setKey}
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label={t('admin.value')}
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          style={styles.input}
        />
        {error ? <HelperText type="error">{error}</HelperText> : null}
        <Button
          mode="contained"
          onPress={() => void submit()}
          disabled={!key.trim() || save.isPending}
          loading={save.isPending}
        >
          {t('common.save')}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { backgroundColor: palette.white, borderRadius: 12, marginBottom: spacing.xs },
  input: { backgroundColor: palette.white },
  muted: { color: palette.muted },
});
