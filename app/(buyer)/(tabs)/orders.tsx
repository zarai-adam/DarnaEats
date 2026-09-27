import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, OrderStatusBadge, PriceDisplay, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useBuyerOrders } from '@/features/orders/api';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useLocalized } from '@/localization/useLocalized';
import { formatDate, formatDateKey } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

export default function BuyerOrdersScreen() {
  const { t, language, pickSnapshot } = useLocalized();
  const uid = useUid();
  const orders = useBuyerOrders(uid);
  useRefreshOnFocus(orders.refetch);
  const items = orders.data?.pages.flatMap((p) => p.items) ?? [];

  if (orders.isLoading) return <LoadingState />;
  if (orders.error && !orders.data) return <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.content}
        refreshing={orders.isRefetching}
        onRefresh={() => void orders.refetch()}
        onEndReached={() => orders.hasNextPage && !orders.isFetchingNextPage && void orders.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            title={t('orders.emptyTitle')}
            message={t('orders.emptyMessage')}
            action={
              <Button mode="contained" onPress={() => router.push('/home')}>
                {t('orders.browse')}
              </Button>
            }
          />
        }
        ListFooterComponent={orders.isFetchingNextPage ? <LoadingState /> : null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/order/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${item.sellerName}, ${t(`orderStatus.${item.status}`)}`}
          >
            <View style={styles.between}>
              <Text variant="titleSmall" style={styles.flex}>
                {item.sellerName}
              </Text>
              <OrderStatusBadge status={item.status} />
            </View>
            <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
              {item.items.map((i) => `${i.quantity}× ${pickSnapshot(i.dishNameSnapshot)}`).join(', ')}
            </Text>
            <View style={styles.between}>
              <Text variant="bodySmall" style={styles.muted}>
                {item.orderNumber} · {formatDateKey(item.scheduledDate, language)} {item.scheduledTimeSlot}
              </Text>
              <PriceDisplay amount={item.total} variant="titleSmall" />
            </View>
            <Text variant="bodySmall" style={styles.muted}>
              {t('orders.placedOn', { date: formatDate(item.createdAt, language, true) })}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
