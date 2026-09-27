import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getDishAvailability } from '@shared/availability';
import { useLocalized } from '@/localization/useLocalized';
import type { Dish } from '@/types/models';
import { palette, radius, spacing } from '@/theme';
import { AvailabilityBadge } from './Badges';
import { DishImage } from './DishImage';
import { PriceDisplay } from './PriceDisplay';

interface Props {
  dish: Dish & { distanceKm?: number };
  onPress: () => void;
  variant?: 'grid' | 'row';
  showSeller?: boolean;
}

function DishCardBase({ dish, onPress, variant = 'row', showSeller = true }: Props) {
  const { t, pick } = useLocalized();
  const name = pick(dish, 'name');
  const availability = getDishAvailability(dish);
  const a11y = `${name}, ${dish.price} ${t('common.currency')}${showSeller && dish.sellerName ? `, ${dish.sellerName}` : ''}`;

  if (variant === 'grid') {
    return (
      <Pressable onPress={onPress} style={styles.gridCard} accessibilityRole="button" accessibilityLabel={a11y}>
        <View style={styles.gridImage}>
          <DishImage uri={dish.imageUrls[0]} categoryId={dish.categoryId} />
        </View>
        <View style={styles.gridBody}>
          <Text variant="titleSmall" numberOfLines={1}>
            {name}
          </Text>
          {showSeller && dish.sellerName ? (
            <Text variant="bodySmall" numberOfLines={1} style={styles.muted}>
              {dish.sellerName}
            </Text>
          ) : null}
          <View style={styles.between}>
            <PriceDisplay amount={dish.price} variant="titleSmall" />
          </View>
          <AvailabilityBadge state={availability} quantity={dish.availableQuantity} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.rowCard} accessibilityRole="button" accessibilityLabel={a11y}>
      <View style={styles.rowImage}>
        <DishImage uri={dish.imageUrls[0]} categoryId={dish.categoryId} />
      </View>
      <View style={styles.rowBody}>
        <Text variant="titleSmall" numberOfLines={2}>
          {name}
        </Text>
        {showSeller && dish.sellerName ? (
          <Text variant="bodySmall" numberOfLines={1} style={styles.muted}>
            {dish.sellerName}
            {dish.distanceKm !== undefined
              ? ` · ${t('common.distanceKm', { km: Math.max(1, Math.round(dish.distanceKm)) })}`
              : ''}
          </Text>
        ) : null}
        <View style={styles.between}>
          <PriceDisplay amount={dish.price} variant="titleSmall" />
          <AvailabilityBadge state={availability} quantity={dish.availableQuantity} />
        </View>
      </View>
    </Pressable>
  );
}

export const DishCard = memo(DishCardBase);

const styles = StyleSheet.create({
  gridCard: {
    width: 176,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  gridImage: { height: 110 },
  gridBody: { padding: spacing.sm, gap: 4 },
  rowCard: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 96,
  },
  rowImage: { width: 104 },
  rowBody: { flex: 1, padding: spacing.sm, gap: 4, justifyContent: 'space-between' },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  muted: { color: palette.muted },
});
