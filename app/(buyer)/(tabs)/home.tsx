import { router } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CategoryChip,
  DishCard,
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineBanner,
  PriceDisplay,
  SearchBar,
  SectionHeader,
  SellerCard,
} from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCategories, useGovernorates, useServiceAreas } from '@/features/catalog/api';
import { useLatestDishes } from '@/features/dishes/api';
import { useTodayMenus } from '@/features/menus/api';
import { useTopSellers } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { registerForPushNotifications } from '@/services/notifications';
import { useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette, spacing } from '@/theme';

export default function BuyerHome() {
  const { t, pick } = useLocalized();
  const { user, profile } = useAuth();
  const governorateId = useSettingsStore((s) => s.preferredGovernorateId);
  const setGovernorate = useSettingsStore((s) => s.setPreferredGovernorate);
  const notificationsPrompted = useSettingsStore((s) => s.notificationsPrompted);
  const setNotificationsPrompted = useSettingsStore((s) => s.setNotificationsPrompted);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const categories = useCategories();
  const governorates = useGovernorates();
  const areas = useServiceAreas(true);
  const menus = useTodayMenus(10);
  const dishes = useLatestDishes(governorateId);
  const sellers = useTopSellers(governorateId, 8);

  useEffect(() => {
    if (user && !notificationsPrompted) {
      setNotificationsPrompted();
      void registerForPushNotifications(user.uid);
    }
  }, [user, notificationsPrompted, setNotificationsPrompted]);

  const refreshing = dishes.isRefetching || sellers.isRefetching || menus.isRefetching;
  const refresh = () => {
    void dishes.refetch();
    void sellers.refetch();
    void menus.refetch();
  };
  const areaName = (id: string | null) => {
    const area = areas.data?.find((a) => a.id === id);
    return area ? pick(area, 'name') : undefined;
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.terracotta} />}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="bodyMedium" style={styles.muted}>
              {t('home.greeting', { name: profile?.displayName?.split(' ')[0] ?? '' })}
            </Text>
            <Text variant="headlineSmall" accessibilityRole="header">
              {t('home.title')}
            </Text>
          </View>
          <View>
            <IconButton
              icon="cart-outline"
              size={28}
              onPress={() => router.push('/cart')}
              accessibilityLabel={t('cart.openCart', { count: cartCount })}
            />
            {cartCount > 0 ? <Badge style={styles.badge}>{cartCount}</Badge> : null}
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={t('search.placeholder')}
        >
          <View pointerEvents="none">
            <SearchBar value="" editable={false} />
          </View>
        </Pressable>
        <View style={styles.row}>
          <CategoryChip label={t('home.allAreas')} selected={!governorateId} onPress={() => setGovernorate(null)} />
          {governorates.data?.map((g) => (
            <CategoryChip
              key={g.id}
              label={pick(g, 'name')}
              selected={governorateId === g.id}
              onPress={() => setGovernorate(g.id)}
            />
          ))}
        </View>

        <SectionHeader title={t('home.categories')} />
        <FlatList
          horizontal
          data={categories.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.hList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <CategoryChip
              label={pick(item, 'name')}
              icon={item.icon}
              onPress={() => router.push(`/category/${item.id}`)}
            />
          )}
        />

        <SectionHeader
          title={t('home.dailyMenus')}
          actionLabel={t('common.seeAll')}
          onAction={() => router.push('/daily-menu')}
        />
        {menus.isLoading ? <LoadingState /> : null}
        {menus.data && menus.data.length === 0 ? <Text style={styles.muted}>{t('dailyMenu.none')}</Text> : null}
        <FlatList
          horizontal
          data={menus.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.hList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.menuCard}>
              <Text
                variant="titleSmall"
                onPress={() => router.push(`/kitchen/${item.sellerId}`)}
                accessibilityRole="link"
              >
                {item.sellerName}
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                {pick(item, 'title')}
              </Text>
              {(item.dishSummaries ?? []).slice(0, 3).map((d) => (
                <View key={d.id} style={styles.menuLine}>
                  <Text
                    variant="bodyMedium"
                    style={styles.flex}
                    numberOfLines={1}
                    onPress={() => router.push(`/dish/${d.id}`)}
                    accessibilityRole="link"
                  >
                    {pick(d, 'name')}
                  </Text>
                  <PriceDisplay amount={d.price} variant="bodyMedium" />
                </View>
              ))}
            </View>
          )}
        />

        <SectionHeader
          title={t('home.recommendedSellers')}
          actionLabel={t('home.map')}
          onAction={() => router.push('/map')}
        />
        {sellers.error && !sellers.data ? (
          <ErrorState error={sellers.error} onRetry={() => void sellers.refetch()} />
        ) : null}
        <FlatList
          horizontal
          data={sellers.data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.hList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <SellerCard
              compact
              seller={item}
              areaName={areaName(item.serviceAreaId)}
              onPress={() => router.push(`/kitchen/${item.id}`)}
            />
          )}
        />

        <SectionHeader
          title={t('home.nearbyFood')}
          actionLabel={t('common.seeAll')}
          onAction={() => router.push('/search')}
        />
        {dishes.isLoading ? <LoadingState /> : null}
        {dishes.error && !dishes.data ? (
          <ErrorState error={dishes.error} onRetry={() => void dishes.refetch()} />
        ) : null}
        {dishes.data?.length === 0 ? (
          <EmptyState title={t('home.noDishes')} message={t('home.noDishesMessage')} />
        ) : null}
        <View style={styles.list}>
          {dishes.data?.map((dish) => (
            <DishCard key={dish.id} dish={dish} onPress={() => router.push(`/dish/${dish.id}`)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  content: { padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  badge: { position: 'absolute', top: 4, end: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hList: { gap: spacing.sm, paddingVertical: spacing.xs },
  menuCard: {
    width: 260,
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  menuLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  list: { gap: spacing.sm },
  muted: { color: palette.muted },
});
