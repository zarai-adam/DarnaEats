import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ChipSelector, EmptyState, ErrorState, LoadingState, Screen } from '@/components';
import { useAuditLogs } from '@/features/admin/api';
import { useLocalized } from '@/localization/useLocalized';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

const ENTITY_TYPES = [
  'all',
  'seller',
  'order',
  'review',
  'report',
  'dish',
  'user',
  'conversation',
  'categories',
  'serviceAreas',
  'appSettings',
];

/** Read-only audit trail (append-only; written exclusively by Cloud Functions). */
export default function AuditLogScreen() {
  const { t, language } = useLocalized();
  const [entityType, setEntityType] = useState('all');
  const logs = useAuditLogs(entityType);
  const items = logs.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.content}
        refreshing={logs.isRefetching}
        onRefresh={() => void logs.refetch()}
        onEndReached={() => logs.hasNextPage && void logs.fetchNextPage()}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <ChipSelector
              multiple={false}
              options={ENTITY_TYPES.map((e) => ({ value: e, label: e === 'all' ? t('common.all') : e }))}
              selected={[entityType]}
              onChange={([v]) => setEntityType(v ?? 'all')}
            />
            {logs.isLoading ? <LoadingState /> : null}
            {logs.error && !logs.data ? <ErrorState error={logs.error} onRetry={() => void logs.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={logs.data ? <EmptyState icon="history" title={t('admin.noAudit')} /> : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text variant="titleSmall" style={styles.mono}>
              {item.action}
            </Text>
            <Text variant="bodySmall">
              {t('admin.entity')}: {item.entityType}/{item.entityId}
            </Text>
            <Text variant="bodySmall">
              {t('admin.actor')}: {item.actorId}
            </Text>
            {item.reason ? (
              <Text variant="bodySmall">
                {t('common.reason')}: {item.reason}
              </Text>
            ) : null}
            {item.metadata && Object.keys(item.metadata).length > 0 ? (
              <Text variant="bodySmall" style={[styles.muted, styles.mono]} numberOfLines={4}>
                {JSON.stringify(item.metadata)}
              </Text>
            ) : null}
            <Text variant="bodySmall" style={styles.muted}>
              {formatDate(item.createdAt, language, true)}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  mono: { writingDirection: 'ltr', textAlign: 'left' },
  muted: { color: palette.muted },
});
