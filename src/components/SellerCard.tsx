import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalized } from '@/localization/useLocalized';
import type { SellerProfile } from '@/types/models';
import { palette, radius, spacing } from '@/theme';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';
import { VerifiedBadge } from './VerifiedBadge';

function SellerCardBase({
  seller,
  areaName,
  onPress,
  compact = false,
}: {
  seller: SellerProfile;
  areaName?: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const { t } = useLocalized();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, compact && styles.compact]}
      accessibilityRole="button"
      accessibilityLabel={`${seller.displayName}, ${t('trust.verifiedKitchen')}${areaName ? `, ${areaName}` : ''}`}
    >
      <Avatar uri={seller.profilePhotoUrl} name={seller.displayName} size={compact ? 48 : 56} />
      <View style={styles.body}>
        <Text variant="titleSmall" numberOfLines={1}>
          {seller.displayName}
        </Text>
        <VerifiedBadge compact={compact} />
        <RatingStars rating={seller.averageRating} count={seller.reviewCount} size={13} />
        {areaName ? (
          <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
            {t('seller.approxArea', { area: areaName })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const SellerCard = memo(SellerCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  compact: { width: 260 },
  body: { flex: 1, gap: 4 },
  muted: { color: palette.muted },
});
