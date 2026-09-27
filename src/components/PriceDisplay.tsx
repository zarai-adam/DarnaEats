import { Text } from 'react-native-paper';
import type { TextProps } from 'react-native-paper';
import { useLocalized } from '@/localization/useLocalized';
import { formatPrice } from '@/utils/format';
import { palette } from '@/theme';

export function PriceDisplay({
  amount,
  variant = 'titleMedium',
  ...rest
}: { amount: number } & Omit<TextProps<never>, 'children'>) {
  const { language } = useLocalized();
  return (
    <Text variant={variant} {...rest} style={[{ color: palette.terracottaDark }, rest.style]}>
      {formatPrice(amount, language)}
    </Text>
  );
}
