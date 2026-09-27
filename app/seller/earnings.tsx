import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ErrorState, LoadingState, PriceDisplay, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useSellerEarnings } from '@/features/orders/api';
import { useLocalized } from '@/localization/useLocalized';
import { palette, radius, spacing } from '@/theme';

export default function Earnings() {
  const { t } = useLocalized();
  const uid = useUid();
  const earnings = useSellerEarnings(uid);
  if (earnings.isLoading) return <LoadingState />;
  if (!earnings.data) return <ErrorState error={earnings.error} onRetry={() => void earnings.refetch()} />;
  const rows = [
    { key: 'earnings.today', v: earnings.data.today },
    { key: 'earnings.week', v: earnings.data.week },
    { key: 'earnings.month', v: earnings.data.month },
    { key: 'earnings.allTime', v: earnings.data.allTime },
  ];
  return (
    <Screen scroll refreshing={earnings.isRefetching} onRefresh={() => void earnings.refetch()}>
      {rows.map((row) => (
        <View key={row.key} style={styles.card} accessibilityLabel={`${t(row.key)}: ${row.v.total}`}>
          <Text variant="titleMedium">{t(row.key)}</Text>
          <PriceDisplay amount={row.v.total} variant="headlineSmall" />
          <Text variant="bodySmall" style={styles.muted}>
            {t('earnings.ordersCount', { count: row.v.count })}
          </Text>
        </View>
      ))}
      <Text variant="bodySmall" style={styles.muted}>
        {t('earnings.note')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  muted: { color: palette.muted },
});
