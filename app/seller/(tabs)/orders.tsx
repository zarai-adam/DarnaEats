import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, OrderStatusBadge, PriceDisplay, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useSellerOrders, type SellerOrderFilter } from '@/features/orders/api';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useLocalized } from '@/localization/useLocalized';
import { formatDateKey } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

const FILTERS: SellerOrderFilter[] = ['active', 'pending', 'completed', 'cancelled', 'all'];

export default function SellerOrders() {
  const { t, language, pickSnapshot } = useLocalized();
  const uid = useUid();
  const [filter, setFilter] = useState<SellerOrderFilter>('active');
  const orders = useSellerOrders(uid, filter);
  useRefreshOnFocus(orders.refetch);
  const items = orders.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f}
        style={styles.filters}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Chip
            selected={filter === item}
            onPress={() => setFilter(item)}
            style={styles.chip}
            accessibilityRole="radio"
            accessibilityState={{ checked: filter === item }}
          >
            {t(`sellerOrders.filter.${item}`)}
          </Chip>
        )}
      />
      {orders.isLoading ? (
        <LoadingState />
      ) : orders.error && !orders.data ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.content}
          refreshing={orders.isRefetching}
          onRefresh={() => void orders.refetch()}
          onEndReached={() => orders.hasNextPage && !orders.isFetchingNextPage && void orders.fetchNextPage()}
          ListEmptyComponent={<EmptyState icon="receipt" title={t('sellerOrders.empty')} />}
          ListFooterComponent={orders.isFetchingNextPage ? <LoadingState /> : null}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/seller/order/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${item.orderNumber}, ${item.buyerName}, ${t(`orderStatus.${item.status}`)}`}
            >
              <View style={styles.between}>
                <Text variant="titleSmall">
                  {item.orderNumber} · {item.buyerName}
                </Text>
                <OrderStatusBadge status={item.status} />
              </View>
              <Text variant="bodyMedium" numberOfLines={2}>
                {item.items.map((i) => `${i.quantity}× ${pickSnapshot(i.dishNameSnapshot)}`).join(', ')}
              </Text>
              <View style={styles.between}>
                <Text variant="bodySmall" style={styles.muted}>
                  {t(item.fulfillmentMethod === 'pickup' ? 'fulfillment.pickup' : 'fulfillment.sellerDelivery')} ·{' '}
                  {formatDateKey(item.scheduledDate, language)} {item.scheduledTimeSlot}
                </Text>
                <PriceDisplay amount={item.total} variant="titleSmall" />
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexGrow: 0 },
  filterContent: { padding: spacing.md, gap: spacing.xs },
  chip: { minHeight: 40, justifyContent: 'center' },
  content: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  muted: { color: palette.muted, flex: 1 },
});
