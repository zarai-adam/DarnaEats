import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { spacing } from '@/theme';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text variant="titleMedium" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Button compact onPress={onAction} accessibilityLabel={`${actionLabel}: ${title}`}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    minHeight: 44,
  },
  title: { flex: 1 },
});
