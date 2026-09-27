import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  ErrorState,
  OrderStatusBadge,
  PriceDisplay,
  RatingStars,
  Screen,
  SectionHeader,
  VerifiedBadge,
} from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMyDishes } from '@/features/dishes/api';
import { useSellerEarnings, useSellerOrders } from '@/features/orders/api';
import { useMySellerProfile } from '@/features/sellers/api';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useLocalized } from '@/localization/useLocalized';
import { formatDateKey } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${label}: ${value}`}>
      <Text variant="headlineSmall">{value}</Text>
      <Text variant="bodySmall" style={styles.muted}>
        {label}
      </Text>
    </View>
  );
}

export default function SellerDashboard() {
  const { t, language, pickSnapshot } = useLocalized();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  const earnings = useSellerEarnings(uid);
  const active = useSellerOrders(uid, 'active');
  const dishes = useMyDishes(uid);
  useRefreshOnFocus(active.refetch);
  const activeOrders = active.data?.pages.flatMap((p) => p.items) ?? [];
  const soldOut = (dishes.data ?? []).filter((d) => d.isActive && d.availableQuantity === 0).length;

  const refresh = () => {
    void profile.refetch();
    void earnings.refetch();
    void active.refetch();
    void dishes.refetch();
  };

  return (
    <Screen scroll refreshing={active.isRefetching} onRefresh={refresh}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="titleLarge">{profile.data?.displayName}</Text>
          <VerifiedBadge />
        </View>
        {profile.data ? <RatingStars rating={profile.data.averageRating} count={profile.data.reviewCount} /> : null}
      </View>

      {earnings.error && !earnings.data ? (
        <ErrorState error={earnings.error} onRetry={() => void earnings.refetch()} />
      ) : null}
      <View style={styles.stats}>
        <Stat label={t('dashboard.pending')} value={earnings.data?.pendingCount ?? '—'} />
        <Stat label={t('dashboard.todayOrders')} value={earnings.data?.today.count ?? '—'} />
        <Stat label={t('dashboard.completedTotal')} value={earnings.data?.allTime.count ?? '—'} />
      </View>
      <View style={styles.earn}>
        <Text variant="bodyMedium">{t('dashboard.weekEarnings')}</Text>
        <PriceDisplay amount={earnings.data?.week.total ?? 0} variant="headlineSmall" />
        <Button compact onPress={() => router.push('/seller/earnings')}>
          {t('earnings.title')}
        </Button>
      </View>

      {soldOut > 0 ? (
        <Button mode="contained-tonal" icon="alert" onPress={() => router.push('/seller/menu')}>
          {t('dashboard.soldOutDishes', { count: soldOut })}
        </Button>
      ) : null}

      <View style={styles.row}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => router.push('/seller/dish/new')}
          style={styles.flex}
          contentStyle={styles.btn}
        >
          {t('dashboard.addDish')}
        </Button>
        <Button
          mode="outlined"
          icon="calendar-today"
          onPress={() => router.push('/seller/menu-editor')}
          style={styles.flex}
          contentStyle={styles.btn}
        >
          {t('dashboard.todayMenu')}
        </Button>
      </View>

      <SectionHeader
        title={t('dashboard.activeOrders')}
        actionLabel={t('common.seeAll')}
        onAction={() => router.push('/seller/orders')}
      />
      {activeOrders.length === 0 ? <Text style={styles.muted}>{t('dashboard.noActiveOrders')}</Text> : null}
      {activeOrders.slice(0, 5).map((o) => (
        <Button
          key={o.id}
          mode="text"
          onPress={() => router.push(`/seller/order/${o.id}`)}
          contentStyle={styles.orderRow}
          style={styles.order}
        >
          <View style={styles.orderInner}>
            <OrderStatusBadge status={o.status} />
            <Text variant="bodyMedium" numberOfLines={1} style={styles.flex}>
              {o.buyerName} · {o.items.map((i) => `${i.quantity}× ${pickSnapshot(i.dishNameSnapshot)}`).join(', ')}
            </Text>
            <Text variant="bodySmall">
              {formatDateKey(o.scheduledDate, language)} {o.scheduledTimeSlot.slice(0, 5)}
            </Text>
          </View>
        </Button>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  earn: { backgroundColor: '#E3E8CF', borderRadius: radius.md, padding: spacing.md, gap: 4 },
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: { minHeight: 48 },
  order: { backgroundColor: palette.white, borderRadius: radius.md, borderWidth: 1, borderColor: palette.border },
  orderRow: { minHeight: 56, justifyContent: 'flex-start' },
  orderInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  muted: { color: palette.muted },
});
