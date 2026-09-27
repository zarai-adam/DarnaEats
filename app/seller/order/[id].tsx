import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import type { OrderStatus } from '@shared/constants';
import { allowedTransitions } from '@shared/orderStateMachine';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  OrderTimeline,
  PriceDisplay,
  ReasonDialog,
  ReportButton,
  Screen,
  SectionHeader,
} from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { conversationIdFor } from '@/features/chat/api';
import { useOrder, useUpdateOrderStatus } from '@/features/orders/api';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { errorMessage } from '@/utils/errors';
import { formatDate, formatDateKey } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

const PRIMARY_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: 'sellerOrders.accept',
  preparing: 'sellerOrders.startPreparing',
  ready: 'sellerOrders.markReady',
  out_for_delivery: 'sellerOrders.outForDelivery',
  completed: 'sellerOrders.markCompleted',
};

export default function SellerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, pickSnapshot } = useLocalized();
  const uid = useUid();
  const order = useOrder(id);
  const update = useUpdateOrderStatus();
  const [dialog, setDialog] = useState<OrderStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (order.isLoading) return <LoadingState />;
  if (order.error && !order.data) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;
  if (!order.data || order.data.sellerId !== uid) return <EmptyState title={t('orders.notFound')} />;
  const o = order.data;
  const actions = allowedTransitions(o.status, 'seller', o.fulfillmentMethod);
  const forward = actions.filter((s) => s !== 'cancelled' && s !== 'disputed');

  const run = async (status: OrderStatus, reason?: string) => {
    try {
      await update.mutateAsync({ orderId: o.id, status, ...(reason ? { reason } : {}) });
      if (status === 'completed') track('order_completed', { order_id: o.id, value: o.total });
      setNotice(t('orders.updated'));
    } catch (e) {
      setNotice(errorMessage(e, t));
    } finally {
      setDialog(null);
    }
  };

  return (
    <Screen scroll refreshing={order.isRefetching} onRefresh={() => void order.refetch()}>
      <View style={styles.between}>
        <Text variant="titleLarge">{o.orderNumber}</Text>
        <OrderStatusBadge status={o.status} />
      </View>
      <Text variant="titleMedium">{o.buyerName}</Text>

      <View style={styles.card}>
        <Text variant="bodyLarge">
          {t(o.fulfillmentMethod === 'pickup' ? 'fulfillment.pickup' : 'fulfillment.sellerDelivery')}
        </Text>
        <Text variant="bodyLarge">
          {formatDateKey(o.scheduledDate, language)} · {o.scheduledTimeSlot}
        </Text>
        {o.fulfillmentMethod === 'seller_delivery' ? (
          <Text variant="bodyMedium">
            {t('checkout.deliveryAddress')}: {o.deliveryAddress}
          </Text>
        ) : null}
        {o.buyerNotes ? (
          <Text variant="bodyMedium">
            {t('checkout.notes')}: {o.buyerNotes}
          </Text>
        ) : null}
        {o.cancelReason ? (
          <Text variant="bodySmall" style={styles.danger}>
            {t('orders.cancelReason')}: {o.cancelReason}
          </Text>
        ) : null}
        <Text variant="bodySmall" style={styles.muted}>
          {t('orders.placedOn', { date: formatDate(o.createdAt, language, true) })}
        </Text>
      </View>

      <SectionHeader title={t('orders.items')} />
      <View style={styles.card}>
        {o.items.map((item) => (
          <View key={item.dishId}>
            <View style={styles.between}>
              <Text variant="bodyLarge" style={styles.flex}>
                {item.quantity}× {pickSnapshot(item.dishNameSnapshot)}
              </Text>
              <PriceDisplay amount={item.subtotal} variant="bodyLarge" />
            </View>
            {item.notes ? (
              <Text variant="bodySmall" style={styles.muted}>
                “{item.notes}”
              </Text>
            ) : null}
          </View>
        ))}
        <View style={styles.between}>
          <Text variant="bodyMedium">{t('checkout.deliveryFee')}</Text>
          <PriceDisplay amount={o.deliveryFee} variant="bodyMedium" />
        </View>
        <View style={styles.between}>
          <Text variant="titleMedium">{t('sellerOrders.cashToCollect')}</Text>
          <PriceDisplay amount={o.total} />
        </View>
      </View>

      <View style={styles.card}>
        <OrderTimeline status={o.status} fulfillment={o.fulfillmentMethod} history={o.statusHistory ?? []} />
      </View>

      <View style={styles.actions}>
        {forward.map((status) => (
          <Button
            key={status}
            mode="contained"
            onPress={() => void run(status)}
            loading={update.isPending}
            disabled={update.isPending}
            contentStyle={styles.btn}
          >
            {t(PRIMARY_LABEL[status] ?? `orderStatus.${status}`)}
          </Button>
        ))}
        <Button
          mode="outlined"
          icon="chat-outline"
          onPress={() => router.push(`/chat/${conversationIdFor(o.buyerId, o.sellerId)}`)}
          contentStyle={styles.btn}
        >
          {t('chat.messageBuyer')}
        </Button>
        {actions.includes('cancelled') ? (
          <Button textColor={palette.danger} icon="close" onPress={() => setDialog('cancelled')}>
            {t('sellerOrders.decline')}
          </Button>
        ) : null}
        {actions.includes('disputed') ? (
          <Button textColor={palette.danger} icon="alert-octagon-outline" onPress={() => setDialog('disputed')}>
            {t('orders.dispute')}
          </Button>
        ) : null}
        <ReportButton targetType="buyer" targetId={o.buyerId} />
      </View>

      <ReasonDialog
        visible={dialog !== null}
        title={dialog === 'disputed' ? t('orders.disputeTitle') : t('sellerOrders.declineTitle')}
        message={dialog === 'disputed' ? t('orders.disputeMessage') : t('sellerOrders.declineMessage')}
        confirmLabel={dialog === 'disputed' ? t('orders.dispute') : t('sellerOrders.decline')}
        destructive
        loading={update.isPending}
        onDismiss={() => setDialog(null)}
        onConfirm={(reason) => dialog && void run(dialog, reason)}
      />
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={3500}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  btn: { minHeight: 50 },
  muted: { color: palette.muted },
  danger: { color: palette.danger },
});
