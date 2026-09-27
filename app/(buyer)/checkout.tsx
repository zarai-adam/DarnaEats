import { zodResolver } from '@hookform/resolvers/zod';
import { useQueries } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, RadioButton, Text, Button, TextInput } from 'react-native-paper';
import { requiredLeadMinutes } from '@shared/availability';
import { availableSlots, schedulableDates } from '@shared/time';
import { ErrorState, FormField, LoadingState, PriceDisplay, Screen, SectionHeader } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { qk } from '@/features/queryKeys';
import { usePlaceOrder } from '@/features/orders/api';
import { useSellerProfile } from '@/features/sellers/api';
import { useIsOnline } from '@/hooks/useNetwork';
import { useLocalized } from '@/localization/useLocalized';
import { checkoutSchema, type CheckoutValues } from '@/schemas/checkout';
import { track } from '@/services/analytics';
import { db } from '@/services/firebase/app';
import { fromDocOrNull } from '@/services/firebase/converters';
import { FULFILLMENT_PROVIDERS, getFulfillmentProvider } from '@/services/fulfillment';
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS } from '@/services/payments';
import { cartTotals, useCartStore } from '@/store/cartStore';
import type { Dish } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { formatDateKey, randomId } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

export default function CheckoutScreen() {
  const { t, language, pickSnapshot } = useLocalized();
  const uid = useUid();
  const online = useIsOnline();
  const { items, sellerId, clear } = useCartStore();
  const seller = useSellerProfile(sellerId ?? undefined);
  const placeOrder = usePlaceOrder(uid);
  // Stable per checkout visit so retries after a network error never double-order.
  const [idempotencyKey] = useState(() => randomId(24));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dishQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: qk.dish(item.dishId),
      queryFn: async () => fromDocOrNull<Dish>(await getDoc(doc(db, 'dishes', item.dishId))),
      staleTime: 30_000,
    })),
  });
  const dishes = dishQueries.map((q) => q.data).filter((d): d is Dish => Boolean(d));
  const leadMinutes = dishes.reduce((max, d) => Math.max(max, requiredLeadMinutes(d, d.preparationTimeMinutes)), 30);

  const firstAvailable =
    schedulableDates().find((d) => availableSlots(d, new Date(), leadMinutes).length > 0) ?? schedulableDates()[0]!;
  const { control, handleSubmit, setValue, formState } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fulfillmentMethod: 'pickup',
      scheduledDate: firstAvailable,
      scheduledTimeSlot: '',
      deliveryAddress: '',
      buyerNotes: '',
    },
  });
  const method = useWatch({ control, name: 'fulfillmentMethod' });
  const date = useWatch({ control, name: 'scheduledDate' });
  const slot = useWatch({ control, name: 'scheduledTimeSlot' });
  const slots = availableSlots(date, new Date(), leadMinutes);

  if (!sellerId || items.length === 0) return <Redirect href="/cart" />;
  if (seller.isLoading || dishQueries.some((q) => q.isLoading)) return <LoadingState />;
  if (seller.error || !seller.data) return <ErrorState error={seller.error} onRetry={() => void seller.refetch()} />;

  const s = seller.data;
  const provider = getFulfillmentProvider(method);
  const totals = cartTotals(items, provider.deliveryFee(s));
  const unavailable = items.filter((i) => {
    const d = dishes.find((x) => x.id === i.dishId);
    return !d || !d.isActive || d.isHidden || d.availableQuantity < i.quantity;
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    if (!online) {
      setSubmitError(t('checkout.offline'));
      return;
    }
    try {
      const result = await placeOrder.mutateAsync({
        idempotencyKey,
        sellerId,
        items: items.map((i) => ({ dishId: i.dishId, quantity: i.quantity, ...(i.notes ? { notes: i.notes } : {}) })),
        fulfillmentMethod: values.fulfillmentMethod,
        scheduledDate: values.scheduledDate,
        scheduledTimeSlot: values.scheduledTimeSlot,
        ...(values.buyerNotes ? { buyerNotes: values.buyerNotes } : {}),
        ...(values.fulfillmentMethod === 'seller_delivery' ? { deliveryAddress: values.deliveryAddress } : {}),
        paymentMethod: DEFAULT_PAYMENT_METHOD,
      });
      track('order_created', { order_id: result.orderId, value: result.total, fulfillment: values.fulfillmentMethod });
      clear();
      router.replace(`/order-confirmation/${result.orderId}`);
    } catch (e) {
      setSubmitError(errorMessage(e, t));
    }
  });

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          <View style={styles.between}>
            <Text variant="titleMedium">{t('checkout.total')}</Text>
            <PriceDisplay amount={totals.total} variant="titleLarge" />
          </View>
          {!online ? <HelperText type="error">{t('checkout.offline')}</HelperText> : null}
          {submitError ? (
            <HelperText type="error" accessibilityLiveRegion="assertive">
              {submitError}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={submit}
            loading={formState.isSubmitting}
            disabled={formState.isSubmitting || !online || unavailable.length > 0}
            contentStyle={styles.btn}
          >
            {t('checkout.placeOrder')}
          </Button>
        </View>
      }
    >
      <SectionHeader title={t('checkout.fulfillment')} />
      <Controller
        control={control}
        name="fulfillmentMethod"
        render={({ field }) => (
          <RadioButton.Group onValueChange={(v) => field.onChange(v)} value={field.value}>
            {FULFILLMENT_PROVIDERS.map((p) => {
              const available = p.isAvailableFor(s);
              return (
                <View key={p.method} style={[styles.option, !available && styles.disabled]}>
                  <RadioButton.Item
                    label={t(p.labelKey)}
                    value={p.method}
                    disabled={!available}
                    position="leading"
                    labelStyle={styles.optionLabel}
                    accessibilityLabel={t(p.labelKey)}
                  />
                  <Text variant="bodySmall" style={styles.optionHelp}>
                    {available ? t(p.descriptionKey) : t('checkout.notOffered')}
                    {available && p.method === 'seller_delivery'
                      ? ` · ${t('checkout.deliveryFee')}: ${s.deliveryFee} ${t('common.currency')}`
                      : ''}
                  </Text>
                </View>
              );
            })}
          </RadioButton.Group>
        )}
      />

      {method === 'seller_delivery' ? (
        <>
          <FormField
            control={control}
            name="deliveryAddress"
            label={t('checkout.deliveryAddress')}
            multiline
            maxLength={300}
          />
          <Text variant="bodySmall" style={styles.muted}>
            {t('checkout.addressPrivacy')}
          </Text>
        </>
      ) : (
        <Text variant="bodySmall" style={styles.muted}>
          {t('checkout.pickupPrivacy')}
        </Text>
      )}

      <SectionHeader title={t('checkout.when')} />
      <View style={styles.wrap}>
        {schedulableDates().map((d) => (
          <Chip
            key={d}
            selected={date === d}
            onPress={() => {
              setValue('scheduledDate', d);
              setValue('scheduledTimeSlot', '');
            }}
            disabled={availableSlots(d, new Date(), leadMinutes).length === 0}
            style={styles.chip}
            accessibilityRole="radio"
            accessibilityState={{ checked: date === d }}
          >
            {formatDateKey(d, language)}
          </Chip>
        ))}
      </View>
      {leadMinutes > 60 ? (
        <Text variant="bodySmall" style={styles.info}>
          {t('checkout.leadTimeNotice', { hours: Math.ceil(leadMinutes / 60) })}
        </Text>
      ) : null}
      <View style={styles.wrap}>
        {slots.length === 0 ? <Text style={styles.muted}>{t('checkout.noSlots')}</Text> : null}
        {slots.map((sl) => (
          <Chip
            key={sl}
            selected={slot === sl}
            onPress={() => setValue('scheduledTimeSlot', sl, { shouldValidate: true })}
            style={styles.chip}
            accessibilityRole="radio"
            accessibilityState={{ checked: slot === sl }}
          >
            <Text style={{ writingDirection: 'ltr' }}>{sl}</Text>
          </Chip>
        ))}
      </View>
      {formState.errors.scheduledTimeSlot ? (
        <HelperText type="error">
          {t(formState.errors.scheduledTimeSlot.message ?? 'validation.slotRequired')}
        </HelperText>
      ) : null}

      <SectionHeader title={t('checkout.notes')} />
      <Controller
        control={control}
        name="buyerNotes"
        render={({ field }) => (
          <TextInput
            mode="outlined"
            value={field.value}
            onChangeText={field.onChange}
            multiline
            maxLength={300}
            placeholder={t('checkout.notesPlaceholder')}
            style={styles.input}
            accessibilityLabel={t('checkout.notes')}
          />
        )}
      />

      <SectionHeader title={t('checkout.payment')} />
      {PAYMENT_METHODS.map((p) => (
        <View key={p.method} style={styles.option}>
          <RadioButton.Item
            label={t(p.labelKey)}
            value={p.method}
            status="checked"
            position="leading"
            labelStyle={styles.optionLabel}
          />
          <Text variant="bodySmall" style={styles.optionHelp}>
            {t(p.descriptionKey)}
          </Text>
        </View>
      ))}

      <SectionHeader title={t('checkout.summary')} />
      <View style={styles.summary}>
        {items.map((i) => (
          <View key={i.dishId} style={styles.between}>
            <Text variant="bodyMedium" style={styles.flex}>
              {i.quantity}× {pickSnapshot({ ar: i.nameAr, fr: i.nameFr })}
            </Text>
            <PriceDisplay amount={i.subtotal} variant="bodyMedium" />
          </View>
        ))}
        <View style={styles.between}>
          <Text variant="bodyMedium">{t('checkout.deliveryFee')}</Text>
          <PriceDisplay amount={totals.deliveryFee} variant="bodyMedium" />
        </View>
        <Text variant="bodySmall" style={styles.muted}>
          {t('checkout.serverPriceNote')}
        </Text>
      </View>
      {unavailable.length > 0 ? <HelperText type="error">{t('checkout.itemsUnavailable')}</HelperText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  disabled: { opacity: 0.55 },
  optionLabel: { textAlign: 'auto' },
  optionHelp: { paddingHorizontal: spacing.lg, color: palette.muted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 40, justifyContent: 'center' },
  input: { backgroundColor: palette.white },
  summary: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  footer: {
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  btn: { minHeight: 50 },
  info: { color: palette.deepBlue },
  muted: { color: palette.muted },
});
