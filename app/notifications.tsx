import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMarkNotificationRead, useNotifications } from '@/features/notifications/api';
import { useLocalized } from '@/localization/useLocalized';
import { routeForNotification } from '@/services/notifications';
import { useSettingsStore } from '@/store/settingsStore';
import { formatDate } from '@/utils/format';
import { palette, spacing } from '@/theme';

export default function NotificationsScreen() {
  const { t, language, pick } = useLocalized();
  const uid = useUid();
  const mode = useSettingsStore((s) => s.mode);
  const notifications = useNotifications(uid);
  const markRead = useMarkNotificationRead(uid);
  const items = notifications.data?.pages.flatMap((p) => p.items) ?? [];

  if (notifications.isLoading) return <LoadingState />;
  if (notifications.error && !notifications.data)
    return <ErrorState error={notifications.error} onRetry={() => void notifications.refetch()} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.content}
        refreshing={notifications.isRefetching}
        onRefresh={() => void notifications.refetch()}
        onEndReached={() => notifications.hasNextPage && void notifications.fetchNextPage()}
        ListEmptyComponent={<EmptyState icon="bell-outline" title={t('notifications.empty')} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <List.Item
            title={pick(item, 'title')}
            description={`${pick(item, 'body')}\n${formatDate(item.createdAt, language, true)}`}
            descriptionNumberOfLines={3}
            left={(p) => (
              <List.Icon
                {...p}
                icon={item.isRead ? 'bell-outline' : 'bell-ring'}
                color={item.isRead ? palette.muted : palette.terracotta}
              />
            )}
            style={[styles.item, !item.isRead && styles.unread]}
            onPress={() => {
              if (!item.isRead) markRead.mutate(item.id);
              const route = routeForNotification(
                { entityType: item.relatedEntityType, entityId: item.relatedEntityId },
                mode === 'seller',
              );
              if (route) router.push(route as never);
            }}
            accessibilityLabel={`${item.isRead ? '' : t('notifications.unread') + ', '}${pick(item, 'title')}`}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  item: { backgroundColor: palette.white, borderRadius: 12 },
  unread: { borderStartWidth: 4, borderStartColor: palette.terracotta },
});
