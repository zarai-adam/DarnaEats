import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { getDishAvailability, isOrderable } from '@shared/availability';
import {
  AvailabilityBadge,
  EmptyState,
  ErrorState,
  FoodInfo,
  ImageGallery,
  LoadingState,
  PriceDisplay,
  QuantitySelector,
  ReportButton,
  Screen,
  SellerCard,
} from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useCategories } from '@/features/catalog/api';
import { useDish } from '@/features/dishes/api';
import { favoriteId, useFavorites, useToggleFavorite } from '@/features/favorites/api';
import { useSellerProfile } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { useCartStore } from '@/store/cartStore';
import { palette, spacing } from '@/theme';

export default function DishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, pick } = useLocalized();
  const uid = useUid();
  const dish = useDish(id);
  const seller = useSellerProfile(dish.data?.sellerId);
  const categories = useCategories(true);
  const favorites = useFavorites(uid);
  const toggle = useToggleFavorite(uid);
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clear);
  const [quantity, setQuantity] = useState(1);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (id) track('dish_viewed', { dish_id: id });
  }, [id]);

  if (dish.isLoading) return <LoadingState />;
  if (dish.error && !dish.data) return <ErrorState error={dish.error} onRetry={() => void dish.refetch()} />;
  if (!dish.data) return <EmptyState icon="food-off-outline" title={t('dish.notFound')} />;

  const d = dish.data;
  const name = pick(d, 'name');
  const availability = getDishAvailability(d);
  const orderable = isOrderable(d) && d.sellerId !== uid;
  const category = categories.data?.find((c) => c.id === d.categoryId);
  const isFavorite = Boolean(favorites.data?.some((f) => f.id === favoriteId(uid, 'dish', d.id)));

  const add = (force = false) => {
    if (force) clearCart();
    const result = addItem(d, quantity);
    if (result === 'seller_conflict') {
      setConflict(true);
      return;
    }
    track('add_to_cart', { dish_id: d.id, seller_id: d.sellerId, items: quantity });
    router.push('/cart');
  };

  return (
    <Screen
      padded={false}
      scroll
      footer={
        <View style={styles.footer}>
          {orderable ? (
            <>
              <QuantitySelector
                value={quantity}
                max={Math.max(1, Math.min(d.availableQuantity, 20))}
                onChange={setQuantity}
              />
              <Button
                mode="contained"
                icon="cart-plus"
                onPress={() => add()}
                style={styles.flex}
                contentStyle={styles.btn}
              >
                {t('dish.addToCart')}
              </Button>
            </>
          ) : (
            <Text variant="bodyMedium" style={styles.muted}>
              {d.sellerId === uid ? t('dish.ownDish') : t(`availability.${availability}`)}
            </Text>
          )}
        </View>
      }
    >
      <Stack.Screen options={{ title: name }} />
      <ImageGallery images={d.imageUrls} categoryId={d.categoryId} label={name} />
      <View style={styles.body}>
        <Text variant="headlineSmall" accessibilityRole="header">
          {name}
        </Text>
        <View style={styles.row}>
          <PriceDisplay amount={d.price} variant="headlineSmall" />
          <AvailabilityBadge state={availability} quantity={d.availableQuantity} />
        </View>
        {category ? (
          <Text variant="bodySmall" style={styles.muted}>
            {pick(category, 'name')}
          </Text>
        ) : null}
        {pick(d, 'portionDescription') ? (
          <Text variant="bodyMedium">
            {t('dish.portion')}: {pick(d, 'portionDescription')}
          </Text>
        ) : null}
        <Text variant="bodyMedium">{t('dish.prepTime', { minutes: d.preparationTimeMinutes })}</Text>
        {d.isPreOrder ? (
          <Text variant="bodyMedium" style={styles.info}>
            {t('dish.preOrderNotice', { hours: d.leadTimeHours ?? 0 })}
          </Text>
        ) : null}
        {d.availableFrom && d.availableUntil ? (
          <Text variant="bodyMedium">{t('dish.timeWindow', { from: d.availableFrom, until: d.availableUntil })}</Text>
        ) : null}
        {pick(d, 'description') ? (
          <Text variant="bodyLarge" style={styles.desc}>
            {pick(d, 'description')}
          </Text>
        ) : null}

        <FoodInfo dish={d} />

        {seller.data ? <SellerCard seller={seller.data} onPress={() => router.push(`/kitchen/${d.sellerId}`)} /> : null}

        <View style={styles.row}>
          <Button
            icon={isFavorite ? 'heart' : 'heart-outline'}
            onPress={() =>
              toggle.mutate({ targetType: 'dish', targetId: d.id, sellerId: d.sellerId, title: name, isFavorite })
            }
            accessibilityState={{ selected: isFavorite }}
          >
            {isFavorite ? t('favorites.saved') : t('favorites.save')}
          </Button>
          {d.sellerId !== uid ? <ReportButton targetType="dish" targetId={d.id} /> : null}
        </View>
        <Text variant="bodySmall" style={styles.muted}>
          {t('dish.safetyDisclaimer')}
        </Text>
      </View>

      <Portal>
        <Dialog visible={conflict} onDismiss={() => setConflict(false)}>
          <Dialog.Title>{t('cart.conflictTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('cart.conflictMessage')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConflict(false)}>{t('common.cancel')}</Button>
            <Button
              onPress={() => {
                setConflict(false);
                add(true);
              }}
            >
              {t('cart.startNewCart')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  desc: { lineHeight: 24 },
  info: { color: palette.deepBlue },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  flex: { flex: 1 },
  btn: { minHeight: 48 },
  muted: { color: palette.muted },
});
