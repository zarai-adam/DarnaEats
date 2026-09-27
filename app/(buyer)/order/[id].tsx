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
import { reorder } from '@/features/orders/reorder';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { errorMessage } from '@/utils/errors';
import { formatDate, formatDateKey } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

export default function BuyerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, pickSnapshot } = useLocalized();
  const uid = useUid();
  const order = useOrder(id);
  const update = useUpdateOrderStatus();
  const [dialog, setDialog] = useState<OrderStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (order.isLoading) return <LoadingState />;
  if (order.error && !order.data) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;
  if (!order.data) return <EmptyState title={t('orders.notFound')} />;
  const o = order.data;
  const actions = o.buyerId === uid ? allowedTransitions(o.status, 'buyer', o.fulfillmentMethod) : [];

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

  const doReorder = async () => {
    const result = await reorder(o);
    if (result.added === 0) {
      setNotice(t('orders.reorderNone'));
      return;
    }
    if (result.skipped > 0) setNotice(t('orders.reorderPartial', { count: result.skipped }));
    router.push('/cart');
  };

  return (
    <Screen scroll refreshing={order.isRefetching} onRefresh={() => void order.refetch()}>
      <View style={styles.between}>
        <Text variant="titleLarge">{o.orderNumber}</Text>
        <OrderStatusBadge status={o.status} />
      </View>
      <Text
        variant="bodyMedium"
        onPress={() => router.push(`/kitchen/${o.sellerId}`)}
        accessibilityRole="link"
        style={styles.link}
      >
        {o.sellerName}
      </Text>

      <View style={styles.card}>
        <OrderTimeline status={o.status} fulfillment={o.fulfillmentMethod} history={o.statusHistory ?? []} />
      </View>

      <SectionHeader title={t('orders.fulfillment')} />
      <View style={styles.card}>
        <Text variant="bodyLarge">
          {t(o.fulfillmentMethod === 'pickup' ? 'fulfillment.pickup' : 'fulfillment.sellerDelivery')}
        </Text>
        <Text variant="bodyMedium">
          {formatDateKey(o.scheduledDate, language)} · {o.scheduledTimeSlot}
        </Text>
        {o.fulfillmentMethod === 'pickup' ? (
          o.pickupDetails?.address ? (
            <Text variant="bodyMedium">
              {t('orders.pickupAddress')}: {o.pickupDetails.address}
            </Text>
          ) : (
            <Text variant="bodySmall" style={styles.muted}>
              {t('orders.pickupAddressAfterAccept')}
            </Text>
          )
        ) : (
          <Text variant="bodyMedium">
            {t('checkout.deliveryAddress')}: {o.deliveryAddress}
          </Text>
        )}
        {o.buyerNotes ? (
          <Text variant="bodySmall">
            {t('checkout.notes')}: {o.buyerNotes}
          </Text>
        ) : null}
        {o.sellerNotes ? (
          <Text variant="bodySmall">
            {t('orders.sellerNotes')}: {o.sellerNotes}
          </Text>
        ) : null}
        {o.cancelReason ? (
          <Text variant="bodySmall" style={styles.danger}>
            {t('orders.cancelReason')}: {o.cancelReason}
          </Text>
        ) : null}
      </View>

      <SectionHeader title={t('orders.items')} />
      <View style={styles.card}>
        {o.items.map((item) => (
          <View key={item.dishId} style={styles.between}>
            <Text variant="bodyMedium" style={styles.flex}>
              {item.quantity}× {pickSnapshot(item.dishNameSnapshot)}
            </Text>
            <PriceDisplay amount={item.subtotal} variant="bodyMedium" />
          </View>
        ))}
        <View style={styles.between}>
          <Text variant="bodyMedium">{t('checkout.deliveryFee')}</Text>
          <PriceDisplay amount={o.deliveryFee} variant="bodyMedium" />
        </View>
        <View style={styles.between}>
          <Text variant="titleMedium">{t('checkout.total')}</Text>
          <PriceDisplay amount={o.total} />
        </View>
        <Text variant="bodySmall" style={styles.muted}>
          {t('payment.cashOnDelivery')} · {t(`paymentStatus.${o.paymentStatus}`)}
        </Text>
        <Text variant="bodySmall" style={styles.muted}>
          {t('orders.placedOn', { date: formatDate(o.createdAt, language, true) })}
        </Text>
      </View>

      <View style={styles.actions}>
        {actions.includes('completed') ? (
          <Button
            mode="contained"
            icon="check"
            onPress={() => void run('completed')}
            loading={update.isPending}
            contentStyle={styles.btn}
          >
            {t('orders.confirmReceived')}
          </Button>
        ) : null}
        {o.status === 'completed' && !o.reviewed ? (
          <Button
            mode="contained"
            icon="star-outline"
            onPress={() => router.push(`/review/${o.id}`)}
            contentStyle={styles.btn}
          >
            {t('reviews.write')}
          </Button>
        ) : null}
        <Button
          mode="outlined"
          icon="chat-outline"
          onPress={() => router.push(`/chat/${conversationIdFor(o.buyerId, o.sellerId)}`)}
          contentStyle={styles.btn}
        >
          {t('chat.messageSeller')}
        </Button>
        {o.status === 'completed' || o.status === 'cancelled' ? (
          <Button mode="outlined" icon="repeat" onPress={() => void doReorder()} contentStyle={styles.btn}>
            {t('orders.reorder')}
          </Button>
        ) : null}
        {actions.includes('cancelled') ? (
          <Button textColor={palette.danger} icon="close" onPress={() => setDialog('cancelled')}>
            {t('orders.cancel')}
          </Button>
        ) : null}
        {actions.includes('disputed') ? (
          <Button textColor={palette.danger} icon="alert-octagon-outline" onPress={() => setDialog('disputed')}>
            {t('orders.dispute')}
          </Button>
        ) : null}
        <ReportButton targetType="order" targetId={o.id} />
      </View>

      <ReasonDialog
        visible={dialog !== null}
        title={dialog === 'disputed' ? t('orders.disputeTitle') : t('orders.cancelTitle')}
        message={dialog === 'disputed' ? t('orders.disputeMessage') : t('orders.cancelMessage')}
        confirmLabel={dialog === 'disputed' ? t('orders.dispute') : t('orders.cancel')}
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
  btn: { minHeight: 48 },
  link: { color: palette.deepBlue, textDecorationLine: 'underline', minHeight: 32 },
  muted: { color: palette.muted },
  danger: { color: palette.danger },
});
