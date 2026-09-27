import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { useLocalized } from '@/localization/useLocalized';
import type { Dish } from '@/types/models';
import { palette, spacing } from '@/theme';

/**
 * Dietary and allergen information. Absence of data is NEVER presented as
 * absence of allergens: undeclared allergens show "Information not provided".
 */
export function FoodInfo({ dish }: { dish: Dish }) {
  const { t } = useLocalized();
  return (
    <View style={styles.wrap}>
      <Text variant="titleSmall" accessibilityRole="header">
        {t('dish.dietary')}
      </Text>
      {dish.dietaryTags.length > 0 ? (
        <View style={styles.row}>
          {dish.dietaryTags.map((tag) => (
            <Chip key={tag} compact style={styles.chip} icon="leaf">
              {t(`dietary.${tag}`)}
            </Chip>
          ))}
        </View>
      ) : (
        <Text variant="bodyMedium" style={styles.muted}>
          {t('common.infoNotProvided')}
        </Text>
      )}

      <Text variant="titleSmall" accessibilityRole="header">
        {t('dish.allergens')}
      </Text>
      {!dish.allergensDeclared && dish.allergens.length === 0 ? (
        <Text variant="bodyMedium" style={styles.warn}>
          {t('common.infoNotProvided')}
        </Text>
      ) : dish.allergens.length === 0 ? (
        <Text variant="bodyMedium">{t('dish.noAllergensDeclared')}</Text>
      ) : (
        <View style={styles.row}>
          {dish.allergens.map((a) => (
            <Chip key={a} compact style={styles.allergen} icon="alert-outline">
              {t(`allergen.${a}`)}
            </Chip>
          ))}
        </View>
      )}
      <Text variant="bodySmall" style={styles.muted}>
        {t('dish.allergenDisclaimer')}
      </Text>

      <Text variant="bodyMedium">
        {t('dish.spiceLevel')}: {t(`spice.${dish.spiceLevel}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { backgroundColor: '#E3E8CF' },
  allergen: { backgroundColor: '#F4D7D3' },
  muted: { color: palette.muted },
  warn: { color: palette.warning, fontWeight: '600' },
});
