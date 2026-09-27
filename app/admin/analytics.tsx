import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ErrorState, LoadingState, PriceDisplay, Screen, SectionHeader } from '@/components';
import { useAdminAnalytics } from '@/features/admin/api';
import { useGovernorates } from '@/features/catalog/api';
import { useLocalized } from '@/localization/useLocalized';
import { palette, radius, spacing } from '@/theme';

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.barRow} accessibilityLabel={`${label}: ${value}`}>
      <Text variant="bodySmall" style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text variant="bodySmall" style={styles.barValue}>
        {value}
      </Text>
    </View>
  );
}

export default function AdminAnalytics() {
  const { t, pick } = useLocalized();
  const analytics = useAdminAnalytics();
  const governorates = useGovernorates(true);
  if (analytics.isLoading) return <LoadingState />;
  if (!analytics.data) return <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />;
  const a = analytics.data;
  const maxStatus = Math.max(...Object.values(a.ordersByStatus));
  const maxGov = Math.max(...Object.values(a.sellersByGovernorate), 0);
  return (
    <Screen scroll refreshing={analytics.isRefetching} onRefresh={() => void analytics.refetch()}>
      <View style={styles.row}>
        <View style={styles.card}>
          <Text variant="headlineSmall">{a.buyers}</Text>
          <Text variant="bodySmall">{t('admin.analyticsBuyers')}</Text>
        </View>
        <View style={styles.card}>
          <Text variant="headlineSmall">{a.sellers}</Text>
          <Text variant="bodySmall">{t('admin.analyticsSellers')}</Text>
        </View>
      </View>
      <View style={styles.cardWide}>
        <Text variant="bodyMedium">{t('admin.completedValue')}</Text>
        <PriceDisplay amount={a.completedOrderValue} variant="headlineSmall" />
        <Text variant="bodySmall" style={styles.muted}>
          {t('admin.completedValueNote')}
        </Text>
      </View>
      <SectionHeader title={t('admin.ordersByStatus')} />
      <View style={styles.cardWide}>
        {Object.entries(a.ordersByStatus).map(([status, n]) => (
          <Bar key={status} label={t(`orderStatus.${status}`)} value={n} max={maxStatus} />
        ))}
      </View>
      <SectionHeader title={t('admin.sellersByGovernorate')} />
      <View style={styles.cardWide}>
        {Object.entries(a.sellersByGovernorate)
          .filter(([, n]) => n > 0 || maxGov === 0)
          .map(([gov, n]) => {
            const g = governorates.data?.find((x) => x.id === gov);
            return <Bar key={gov} label={g ? pick(g, 'name') : gov} value={n} max={maxGov} />;
          })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardWide: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 110 },
  barTrack: { flex: 1, height: 12, backgroundColor: palette.beige, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, backgroundColor: palette.deepBlue },
  barValue: { width: 40, textAlign: 'right' },
  muted: { color: palette.muted },
});
