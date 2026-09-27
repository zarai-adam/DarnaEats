import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { palette } from '@/theme';

export function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={t('cart.quantityLabel', { count: value })}
    >
      <IconButton
        icon="minus"
        mode="outlined"
        size={20}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityLabel={t('cart.decrease')}
        style={styles.btn}
      />
      <Text variant="titleMedium" style={styles.value}>
        {value}
      </Text>
      <IconButton
        icon="plus"
        mode="outlined"
        size={20}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        accessibilityLabel={t('cart.increase')}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  value: { minWidth: 32, textAlign: 'center', color: palette.text },
  btn: { margin: 0, width: 44, height: 44 },
});
