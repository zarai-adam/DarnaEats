import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { pickImage } from '@/hooks/useImagePicker';
import { errorKey } from '@/utils/errors';
import { palette, radius, spacing } from '@/theme';
import { DishImage } from './DishImage';

/**
 * Pick-and-upload control. `upload` receives the local URI and returns the
 * value to store (a storage path for private files, a URL for public ones).
 */
export function ImageUploadField({
  label,
  description,
  previewUri,
  hasValue,
  upload,
  allowCamera = true,
  privateNotice,
}: {
  label: string;
  description?: string;
  previewUri?: string | null;
  hasValue: boolean;
  upload: (localUri: string) => Promise<void>;
  allowCamera?: boolean;
  privateNotice?: string;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const run = async (camera: boolean) => {
    setError(null);
    const uri = await pickImage({ camera });
    if (!uri) return;
    setBusy(true);
    try {
      await upload(uri);
      setLocalPreview(uri);
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const preview = localPreview ?? previewUri;
  return (
    <View style={styles.wrap}>
      <Text variant="titleSmall" accessibilityRole="header">
        {label}
      </Text>
      {description ? (
        <Text variant="bodySmall" style={styles.muted}>
          {description}
        </Text>
      ) : null}
      {preview ? (
        <View style={styles.preview}>
          <DishImage uri={preview} label={label} />
        </View>
      ) : hasValue ? (
        <Text variant="bodyMedium" style={styles.ok}>
          {t('upload.uploaded')}
        </Text>
      ) : null}
      {privateNotice ? (
        <Text variant="bodySmall" style={styles.muted}>
          {privateNotice}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Button
          mode="outlined"
          icon="image"
          onPress={() => void run(false)}
          loading={busy}
          disabled={busy}
          contentStyle={styles.btn}
        >
          {hasValue ? t('upload.replace') : t('upload.choose')}
        </Button>
        {allowCamera ? (
          <Button mode="text" icon="camera" onPress={() => void run(true)} disabled={busy} contentStyle={styles.btn}>
            {t('upload.camera')}
          </Button>
        ) : null}
      </View>
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  preview: { height: 160, borderRadius: radius.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btn: { minHeight: 44 },
  muted: { color: palette.muted },
  ok: { color: palette.success },
});
