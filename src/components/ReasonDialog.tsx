import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';

/** Confirmation dialog that optionally requires a written reason. */
export function ReasonDialog({
  visible,
  title,
  message,
  confirmLabel,
  requireReason = true,
  destructive = false,
  loading = false,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  requireReason?: boolean;
  destructive?: boolean;
  loading?: boolean;
  onDismiss: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [wasVisible, setWasVisible] = useState(visible);
  // Clear the previous reason each time the dialog opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setReason('');
  }
  const invalid = requireReason && reason.trim().length < 3;
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title accessibilityRole="header">{title}</Dialog.Title>
        <Dialog.Content style={{ gap: 8 }}>
          {message ? <Text variant="bodyMedium">{message}</Text> : null}
          {requireReason ? (
            <>
              <TextInput
                mode="outlined"
                label={t('common.reason')}
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
                accessibilityLabel={t('common.reason')}
              />
              <HelperText type="info">{t('common.reasonHelp')}</HelperText>
            </>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
          <Button
            onPress={() => onConfirm(reason.trim())}
            disabled={invalid || loading}
            loading={loading}
            textColor={destructive ? '#B3261E' : undefined}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
