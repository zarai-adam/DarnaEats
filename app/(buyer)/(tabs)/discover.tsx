import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { CategoryChip, EmptyState, ErrorState, LoadingState, Screen, SectionHeader, SellerCard } from '@/components';
import { useCategories, useGovernorates, useServiceAreas } from '@/features/catalog/api';
import { useTopSellers } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';

export default function DiscoverScreen() {
  const { t, pick } = useLocalized();
  const governorateId = useSettingsStore((s) => s.preferredGovernorateId);
  const setGovernorate = useSettingsStore((s) => s.setPreferredGovernorate);
  const categories = useCategories();
  const governorates = useGovernorates();
  const areas = useServiceAreas(true);
  const sellers = useTopSellers(governorateId, 30);

  return (
    <Screen padded={false}>
      <FlatList
        data={sellers.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        refreshing={sellers.isRefetching}
        onRefresh={() => void sellers.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.row}>
              <Button
                mode="contained"
                icon="magnify"
                onPress={() => router.push('/search')}
                style={styles.flex}
                contentStyle={styles.btn}
              >
                {t('search.title')}
              </Button>
              <Button
                mode="outlined"
                icon="map-outline"
                onPress={() => router.push('/map')}
                style={styles.flex}
                contentStyle={styles.btn}
              >
                {t('map.title')}
              </Button>
            </View>
            <Button
              mode="text"
              icon="calendar-today"
              onPress={() => router.push('/daily-menu')}
              contentStyle={styles.btn}
            >
              {t('dailyMenu.title')}
            </Button>
            <SectionHeader title={t('home.categories')} />
            <View style={styles.wrap}>
              {categories.data?.map((c) => (
                <CategoryChip
                  key={c.id}
                  label={pick(c, 'name')}
                  icon={c.icon}
                  onPress={() => router.push(`/category/${c.id}`)}
                />
              ))}
            </View>
            <SectionHeader title={t('discover.kitchens')} />
            <View style={styles.wrap}>
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
            {sellers.isLoading ? <LoadingState /> : null}
            {sellers.error && !sellers.data ? (
              <ErrorState error={sellers.error} onRetry={() => void sellers.refetch()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          sellers.data ? (
            <EmptyState icon="chef-hat" title={t('discover.noKitchens')} message={t('discover.noKitchensMessage')} />
          ) : null
        }
        renderItem={({ item }) => {
          const area = areas.data?.find((a) => a.id === item.serviceAreaId);
          return (
            <SellerCard
              seller={item}
              areaName={area ? pick(area, 'name') : undefined}
              onPress={() => router.push(`/kitchen/${item.id}`)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1 },
  btn: { minHeight: 48 },
});
