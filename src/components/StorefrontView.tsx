import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { useServiceAreas } from '@/features/catalog/api';
import { useSellerPublicDishes } from '@/features/dishes/api';
import { useLocalized } from '@/localization/useLocalized';
import type { SellerProfile } from '@/types/models';
import { palette, radius, spacing } from '@/theme';
import { Avatar } from './Avatar';
import { DishCard } from './DishCard';
import { RatingStars } from './RatingStars';
import { SectionHeader } from './SectionHeader';
import { EmptyState, ErrorState, LoadingState } from './States';
import { VerifiedBadge } from './VerifiedBadge';

/**
 * Public storefront. Used by buyers and by the seller's own preview so both
 * see exactly the same thing. Shows only public, non-sensitive information:
 * the service area is approximate and no address or phone is displayed.
 */
export function StorefrontView({
  seller,
  actions,
  preview = false,
}: {
  seller: SellerProfile;
  actions?: ReactNode;
  preview?: boolean;
}) {
  const { t, pick } = useLocalized();
  const areas = useServiceAreas(true);
  const dishes = useSellerPublicDishes(seller.id);
  const area = areas.data?.find((a) => a.id === seller.serviceAreaId);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Avatar uri={seller.profilePhotoUrl} name={seller.displayName} size={72} />
        <View style={styles.headerText}>
          <Text variant="headlineSmall" accessibilityRole="header">
            {seller.displayName}
          </Text>
          {seller.status === 'approved' ? <VerifiedBadge /> : null}
          <RatingStars rating={seller.averageRating} count={seller.reviewCount} />
          {seller.orderCount > 0 ? (
            <Text variant="bodySmall" style={styles.muted}>
              {t('seller.completedOrders', { count: seller.orderCount })}
            </Text>
          ) : null}
        </View>
      </View>

      {actions}

      <View style={styles.infoCard}>
        {area ? <Text variant="bodyMedium">{t('seller.approxArea', { area: pick(area, 'name') })}</Text> : null}
        <View style={styles.row}>
          {seller.pickupAvailable ? (
            <Chip icon="storefront-outline" compact>
              {t('fulfillment.pickup')}
            </Chip>
          ) : null}
          {seller.selfDeliveryAvailable ? (
            <Chip icon="moped-outline" compact>
              {t('fulfillment.sellerDelivery')}
            </Chip>
          ) : null}
        </View>
        <Text variant="bodySmall" style={styles.muted}>
          {t('seller.addressPrivacy')}
        </Text>
      </View>

      {seller.story ? (
        <>
          <SectionHeader title={t('seller.story')} />
          <Text variant="bodyMedium" style={styles.story}>
            {seller.story}
          </Text>
        </>
      ) : null}

      {seller.specialties.length > 0 ? (
        <>
          <SectionHeader title={t('seller.specialties')} />
          <View style={styles.row}>
            {seller.specialties.map((s) => (
              <Chip key={s} compact style={styles.specialty}>
                {t(`specialty.${s}`, { defaultValue: s })}
              </Chip>
            ))}
          </View>
        </>
      ) : null}

      {seller.kitchenPhotoUrl ? (
        <>
          <SectionHeader title={t('seller.kitchen')} />
          <Image
            source={{ uri: seller.kitchenPhotoUrl }}
            style={styles.kitchen}
            contentFit="cover"
            accessibilityLabel={t('seller.kitchenPhotoOf', { name: seller.displayName })}
          />
        </>
      ) : null}

      <SectionHeader
        title={t('seller.dishes')}
        actionLabel={preview ? undefined : t('reviews.seeAll')}
        onAction={preview ? undefined : () => router.push(`/kitchen/${seller.id}/reviews`)}
      />
      {dishes.isLoading ? <LoadingState /> : null}
      {dishes.error && !dishes.data ? <ErrorState error={dishes.error} onRetry={() => void dishes.refetch()} /> : null}
      {dishes.data?.length === 0 ? <EmptyState title={t('seller.noDishes')} /> : null}
      <View style={styles.list}>
        {dishes.data?.map((dish) => (
          <DishCard
            key={dish.id}
            dish={dish}
            showSeller={false}
            onPress={() => (preview ? undefined : router.push(`/dish/${dish.id}`))}
          />
        ))}
      </View>
      {!preview ? (
        <Button
          mode="outlined"
          icon="star-outline"
          onPress={() => router.push(`/kitchen/${seller.id}/reviews`)}
          contentStyle={{ minHeight: 44 }}
        >
          {t('reviews.readReviews')}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  headerText: { flex: 1, gap: 4 },
  infoCard: {
    backgroundColor: palette.white,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  story: { lineHeight: 22 },
  specialty: { backgroundColor: '#F8DCCF' },
  kitchen: { height: 200, borderRadius: radius.md },
  list: { gap: spacing.sm },
  muted: { color: palette.muted },
});
