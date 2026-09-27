import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MIN_TOUCH, palette } from '@/theme';

interface Props {
  rating: number;
  count?: number;
  size?: number;
  /** When provided, stars become an accessible input. */
  onChange?: (value: number) => void;
}

export function RatingStars({ rating, count, size = 16, onChange }: Props) {
  const { t } = useTranslation();
  const stars = [1, 2, 3, 4, 5];

  if (onChange) {
    return (
      <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel={t('reviews.ratingLabel', { rating })}>
        {stars.map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={styles.touch}
            accessibilityRole="button"
            accessibilityLabel={t('reviews.rateN', { count: n })}
            accessibilityState={{ selected: rating >= n }}
          >
            <MaterialCommunityIcons name={rating >= n ? 'star' : 'star-outline'} size={36} color={palette.terracotta} />
          </Pressable>
        ))}
      </View>
    );
  }

  if (!count) {
    return (
      <Text variant="bodySmall" style={styles.muted}>
        {t('reviews.noReviewsYet')}
      </Text>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel={t('reviews.summaryLabel', { rating: rating.toFixed(1), count })}>
      {stars.map((n) => (
        <MaterialCommunityIcons
          key={n}
          name={rating >= n ? 'star' : rating >= n - 0.5 ? 'star-half-full' : 'star-outline'}
          size={size}
          color={palette.terracotta}
        />
      ))}
      <Text variant="bodySmall" style={styles.muted}>
        {` ${rating.toFixed(1)} (${count})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  touch: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  muted: { color: palette.muted },
});
