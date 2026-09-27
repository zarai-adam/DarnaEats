import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { errorKey } from '@/utils/errors';
import { palette, spacing } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator color={palette.terracotta} size="large" />
      <Text variant="bodyMedium" style={styles.muted}>
        {label ?? t('common.loading')}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = 'food-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <MaterialCommunityIcons
        name={icon}
        size={56}
        color={palette.olive}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text variant="titleMedium" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityRole="alert">
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={56}
        color={palette.danger}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text variant="titleMedium" style={styles.title}>
        {t('common.errorTitle')}
      </Text>
      <Text variant="bodyMedium" style={styles.muted}>
        {t(error ? errorKey(error) : 'errors.generic')}
      </Text>
      {onRetry ? (
        <Button
          mode="contained"
          onPress={onRetry}
          icon="refresh"
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {t('common.retry')}
        </Button>
      ) : null}
    </View>
  );
}

interface QueryStateProps<T> {
  query: { data: T | undefined; isLoading?: boolean; isPending?: boolean; error: unknown; refetch: () => unknown };
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Renders loading / error+retry / empty / content for a query consistently. */
export function QueryState<T>({ query, isEmpty, empty, children }: QueryStateProps<T>) {
  if (query.data === undefined) {
    if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
    return <LoadingState />;
  }
  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    minHeight: 240,
  },
  title: { textAlign: 'center', color: palette.text },
  muted: { textAlign: 'center', color: palette.muted },
  button: { marginTop: spacing.sm },
  buttonContent: { minHeight: 44 },
});
