import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, spacing } from '@/theme';

/** Lightweight accessible bottom sheet built on Modal (no extra native deps). */
export function BottomSheet({
  visible,
  onDismiss,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss} accessibilityViewIsModal>
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityLabel={t('common.close')}
        accessibilityRole="button"
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.header}>
          <Text variant="titleMedium" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <IconButton icon="close" onPress={onDismiss} accessibilityLabel={t('common.close')} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: palette.cream,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingStart: spacing.lg },
  title: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
