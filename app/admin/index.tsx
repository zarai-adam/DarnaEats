import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { ErrorState, Screen, SectionHeader } from '@/components';
import { useAdminStats } from '@/features/admin/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLocalized } from '@/localization/useLocalized';
import { useSettingsStore } from '@/store/settingsStore';
import { palette, radius, spacing } from '@/theme';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

export default function AdminDashboard() {
  const { t } = useLocalized();
  const { isAdmin, signOut } = useAuth();
  const setMode = useSettingsStore((s) => s.setMode);
  const stats = useAdminStats();
  const s = stats.data;

  const metrics: { label: string; value: number | string | null | undefined; route?: Href }[] = [
    { label: t('admin.stats.totalUsers'), value: s?.totalUsers, route: '/admin/users' },
    { label: t('admin.stats.activeSellers'), value: s?.activeSellers, route: '/admin/sellers' },
    { label: t('admin.stats.pendingApplications'), value: s?.pendingApplications, route: '/admin/verification' },
    { label: t('admin.stats.activeDishes'), value: s?.activeDishes, route: '/admin/dishes' },
    { label: t('admin.stats.ordersToday'), value: s?.ordersToday },
    { label: t('admin.stats.completedOrders'), value: s?.completedOrders },
    { label: t('admin.stats.openReports'), value: s?.openReports, route: '/admin/reports' },
    { label: t('admin.stats.flaggedReviews'), value: s?.flaggedReviews, route: '/admin/reviews' },
    { label: t('admin.stats.averageRating'), value: s?.averageRating ?? '—' },
  ];

  const nav: { icon: Icon; label: string; route: Href; adminOnly?: boolean }[] = [
    { icon: 'account-check-outline', label: t('admin.verification'), route: '/admin/verification' },
    { icon: 'flag-outline', label: t('admin.reports'), route: '/admin/reports' },
    { icon: 'star-half-full', label: t('admin.reviews'), route: '/admin/reviews' },
    { icon: 'food-off-outline', label: t('admin.dishes'), route: '/admin/dishes' },
    { icon: 'chef-hat', label: t('admin.sellers'), route: '/admin/sellers' },
    { icon: 'account-group-outline', label: t('admin.users'), route: '/admin/users', adminOnly: true },
    { icon: 'chart-bar', label: t('admin.analytics'), route: '/admin/analytics' },
    { icon: 'history', label: t('admin.audit'), route: '/admin/audit' },
    { icon: 'shape-outline', label: t('admin.categories'), route: '/admin/categories', adminOnly: true },
    { icon: 'map-marker-multiple-outline', label: t('admin.locations'), route: '/admin/locations', adminOnly: true },
    { icon: 'cog-outline', label: t('admin.settings'), route: '/admin/settings', adminOnly: true },
  ];

  return (
    <Screen scroll refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()}>
      {stats.error && !stats.data ? <ErrorState error={stats.error} onRetry={() => void stats.refetch()} /> : null}
      <View style={styles.grid}>
        {metrics.map((m) => (
          <Pressable
            key={m.label}
            style={styles.metric}
            onPress={m.route ? () => router.push(m.route!) : undefined}
            accessibilityRole={m.route ? 'button' : 'text'}
            accessibilityLabel={`${m.label}: ${m.value ?? '…'}`}
          >
            <Text variant="headlineSmall">{m.value ?? '…'}</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <SectionHeader title={t('admin.tools')} />
      <View style={styles.grid}>
        {nav
          .filter((n) => isAdmin || !n.adminOnly)
          .map((n) => (
            <Pressable
              key={n.label}
              style={styles.tile}
              onPress={() => router.push(n.route)}
              accessibilityRole="button"
              accessibilityLabel={n.label}
            >
              <MaterialCommunityIcons name={n.icon} size={28} color={palette.deepBlue} />
              <Text variant="labelLarge" style={styles.center}>
                {n.label}
              </Text>
            </Pressable>
          ))}
      </View>
      <Button
        icon="food-fork-drink"
        onPress={() => {
          setMode('buyer');
          router.replace('/home');
        }}
      >
        {t('admin.openMarketplace')}
      </Button>
      <Button icon="logout" textColor={palette.danger} onPress={() => void signOut().then(() => router.replace('/'))}>
        {t('auth.signOut')}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 72,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 88,
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  muted: { color: palette.muted },
});
