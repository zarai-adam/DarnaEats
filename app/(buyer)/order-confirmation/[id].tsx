import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { LoadingState, PriceDisplay, Screen } from '@/components';
import { useOrder } from '@/features/orders/api';
import { useLocalized } from '@/localization/useLocalized';
import { formatDateKey } from '@/utils/format';
import { palette, spacing } from '@/theme';

export default function OrderConfirmation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLocalized();
  const order = useOrder(id);
  if (!order.data) return <LoadingState />;
  const o = order.data;
  return (
    <Screen scroll contentStyle={styles.center}>
      <MaterialCommunityIcons name="check-circle" size={80} color={palette.olive} />
      <Text variant="headlineSmall" accessibilityRole="header" style={styles.text}>
        {t('checkout.confirmedTitle')}
      </Text>
      <Text variant="bodyLarge" style={styles.text}>
        {t('checkout.confirmedMessage', { seller: o.sellerName })}
      </Text>
      <View style={styles.box}>
        <Text variant="titleMedium">{o.orderNumber}</Text>
        <Text variant="bodyMedium">
          {t(o.fulfillmentMethod === 'pickup' ? 'fulfillment.pickup' : 'fulfillment.sellerDelivery')}
        </Text>
        <Text variant="bodyMedium">
          {formatDateKey(o.scheduledDate, language)} · {o.scheduledTimeSlot}
        </Text>
        <PriceDisplay amount={o.total} variant="titleLarge" />
        <Text variant="bodySmall" style={styles.muted}>
          {t('payment.cashOnDeliveryDescription')}
        </Text>
      </View>
      <Button mode="contained" onPress={() => router.replace(`/order/${o.id}`)} contentStyle={styles.btn}>
        {t('orders.track')}
      </Button>
      <Button onPress={() => router.replace('/home')}>{t('common.backHome')}</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl },
  text: { textAlign: 'center' },
  box: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: palette.border,
  },
  btn: { minHeight: 48, minWidth: 220 },
  muted: { color: palette.muted, textAlign: 'center' },
});
