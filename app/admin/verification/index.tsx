import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, Screen, StatusPill } from '@/components';
import { useVerificationQueue } from '@/features/admin/api';
import { useLocalized } from '@/localization/useLocalized';
import { formatDate } from '@/utils/format';
import { palette, spacing } from '@/theme';

export default function VerificationQueue() {
  const { t, language } = useLocalized();
  const queue = useVerificationQueue();
  if (queue.isLoading) return <LoadingState />;
  if (queue.error && !queue.data) return <ErrorState error={queue.error} onRetry={() => void queue.refetch()} />;
  return (
    <Screen padded={false}>
      <FlatList
        data={queue.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        refreshing={queue.isRefetching}
        onRefresh={() => void queue.refetch()}
        ListEmptyComponent={<EmptyState icon="check-all" title={t('admin.queueEmpty')} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <List.Item
            title={item.displayName || item.id}
            description={t('admin.updatedOn', { date: formatDate(item.updatedAt, language, true) })}
            right={() => <StatusPill label={t(`sellerStatus.${item.status}`)} tone="info" />}
            onPress={() => router.push(`/admin/verification/${item.id}`)}
            style={styles.item}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  item: { backgroundColor: palette.white, borderRadius: 12, minHeight: 64 },
});
