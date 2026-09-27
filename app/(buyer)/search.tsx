import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Chip, Switch, Text } from 'react-native-paper';
import { DIETARY_TAGS, type DietaryTag } from '@shared/constants';
import type { LatLng } from '@shared/geo';
import {
  BottomSheet,
  ChipSelector,
  DishCard,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  SearchBar,
  SelectField,
} from '@/components';
import { useCategories, useGovernorates } from '@/features/catalog/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { getApproximateBuyerLocation } from '@/services/maps/location';
import { searchProvider, type SearchFilters, type SearchSort } from '@/services/search';
import { palette, spacing } from '@/theme';

const SORTS: SearchSort[] = ['newest', 'rating', 'price_asc', 'price_desc', 'nearest'];
const PRICE_BANDS = [
  { key: 'any', min: null, max: null },
  { key: 'under10', min: null, max: 10 },
  { key: '10to25', min: 10, max: 25 },
  { key: 'over25', min: 25, max: null },
] as const;

export default function SearchScreen() {
  const { t, pick } = useLocalized();
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const [filters, setFilters] = useState<SearchFilters>({ categoryId: params.categoryId ?? null, dietaryTags: [] });
  const [sort, setSort] = useState<SearchSort>('newest');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounced = useDebounce(text.trim(), 400);
  const categories = useCategories();
  const governorates = useGovernorates();

  const key = JSON.stringify({ debounced, filters, sort, origin });
  const results = useInfiniteQuery({
    queryKey: ['search', key],
    initialPageParam: null as Awaited<ReturnType<typeof searchProvider.searchDishes>>['cursor'],
    queryFn: async ({ pageParam }) => {
      const result = await searchProvider.searchDishes({ text: debounced, filters, sort, origin, cursor: pageParam });
      if (debounced && !pageParam)
        track('search_performed', { query_length: debounced.length, results: result.items.length });
      return result;
    },
    getNextPageParam: (last) => (last.hasMore ? last.cursor : undefined),
    staleTime: 60_000,
  });
  const items = useMemo(() => results.data?.pages.flatMap((p) => p.items) ?? [], [results.data]);
  const activeFilterCount =
    (filters.categoryId ? 1 : 0) +
    (filters.governorateId ? 1 : 0) +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.dietaryTags?.length ?? 0) +
    (filters.availableNow ? 1 : 0) +
    (filters.fulfillment ? 1 : 0) +
    (filters.preOrderOnly ? 1 : 0);

  const chooseSort = async (next: SearchSort) => {
    if (next === 'nearest' && !origin) {
      const point = await getApproximateBuyerLocation().catch(() => null);
      if (!point) {
        setLocationDenied(true);
        return;
      }
      setOrigin(point);
    }
    setLocationDenied(false);
    setSort(next);
  };

  const band =
    PRICE_BANDS.find((b) => b.min === (filters.minPrice ?? null) && b.max === (filters.maxPrice ?? null))?.key ?? 'any';

  return (
    <Screen padded={false}>
      <View style={styles.top}>
        <SearchBar value={text} onChangeText={setText} autoFocus={!params.categoryId} />
        <View style={styles.row}>
          <Button icon="tune-variant" mode="outlined" onPress={() => setFiltersOpen(true)} contentStyle={styles.btn}>
            {activeFilterCount ? t('search.filtersCount', { count: activeFilterCount }) : t('search.filters')}
          </Button>
          <FlatList
            horizontal
            data={SORTS}
            keyExtractor={(s) => s}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sorts}
            renderItem={({ item }) => (
              <Chip
                selected={sort === item}
                onPress={() => void chooseSort(item)}
                style={styles.chip}
                accessibilityRole="radio"
                accessibilityState={{ checked: sort === item }}
              >
                {t(`search.sort.${item}`)}
              </Chip>
            )}
          />
        </View>
        {locationDenied ? (
          <Text variant="bodySmall" style={styles.muted}>
            {t('search.locationDenied')}
          </Text>
        ) : null}
      </View>

      {results.isLoading ? (
        <LoadingState />
      ) : results.error && !results.data ? (
        <ErrorState error={results.error} onRetry={() => void results.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && void results.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={results.isFetchingNextPage ? <LoadingState /> : null}
          ListEmptyComponent={
            <EmptyState icon="magnify-close" title={t('search.noResults')} message={t('search.noResultsMessage')} />
          }
          renderItem={({ item }) => <DishCard dish={item} onPress={() => router.push(`/dish/${item.id}`)} />}
          keyboardDismissMode="on-drag"
        />
      )}

      <BottomSheet
        visible={filtersOpen}
        onDismiss={() => setFiltersOpen(false)}
        title={t('search.filters')}
        footer={
          <View style={styles.row}>
            <Button onPress={() => setFilters({ dietaryTags: [] })} style={styles.flex}>
              {t('search.clearFilters')}
            </Button>
            <Button
              mode="contained"
              onPress={() => setFiltersOpen(false)}
              style={styles.flex}
              contentStyle={styles.btn}
            >
              {t('search.showResults')}
            </Button>
          </View>
        }
      >
        <SelectField
          label={t('search.category')}
          value={filters.categoryId ?? ''}
          options={[
            { value: '', label: t('common.all') },
            ...(categories.data ?? []).map((c) => ({ value: c.id, label: pick(c, 'name') })),
          ]}
          onChange={(v) => setFilters((f) => ({ ...f, categoryId: v || null }))}
        />
        <SelectField
          label={t('search.area')}
          value={filters.governorateId ?? ''}
          options={[
            { value: '', label: t('home.allAreas') },
            ...(governorates.data ?? []).map((g) => ({ value: g.id, label: pick(g, 'name') })),
          ]}
          onChange={(v) => setFilters((f) => ({ ...f, governorateId: v || null }))}
        />
        <ChipSelector
          label={t('search.price')}
          multiple={false}
          options={PRICE_BANDS.map((b) => ({ value: b.key, label: t(`search.priceBand.${b.key}`) }))}
          selected={[band]}
          onChange={([v]) => {
            const next = PRICE_BANDS.find((b) => b.key === v) ?? PRICE_BANDS[0];
            setFilters((f) => ({ ...f, minPrice: next.min, maxPrice: next.max }));
          }}
        />
        <ChipSelector
          label={t('search.minRating')}
          multiple={false}
          options={[
            { value: '0', label: t('common.all') },
            { value: '3', label: '3+ ★' },
            { value: '4', label: '4+ ★' },
            { value: '4.5', label: '4.5+ ★' },
          ]}
          selected={[String(filters.minRating ?? 0)]}
          onChange={([v]) => setFilters((f) => ({ ...f, minRating: Number(v) || null }))}
        />
        <ChipSelector<DietaryTag>
          label={t('dish.dietary')}
          options={DIETARY_TAGS.map((tag) => ({ value: tag, label: t(`dietary.${tag}`) }))}
          selected={filters.dietaryTags ?? []}
          onChange={(v) => setFilters((f) => ({ ...f, dietaryTags: v }))}
        />
        <ChipSelector
          label={t('search.fulfillment')}
          multiple={false}
          options={[
            { value: 'any', label: t('common.all') },
            { value: 'pickup', label: t('fulfillment.pickup') },
            { value: 'seller_delivery', label: t('fulfillment.sellerDelivery') },
          ]}
          selected={[filters.fulfillment ?? 'any']}
          onChange={([v]) =>
            setFilters((f) => ({ ...f, fulfillment: v === 'any' ? null : (v as 'pickup' | 'seller_delivery') }))
          }
        />
        <View style={styles.switchRow}>
          <Text variant="bodyLarge" style={styles.flex}>
            {t('search.availableNow')}
          </Text>
          <Switch
            value={Boolean(filters.availableNow)}
            onValueChange={(v) => setFilters((f) => ({ ...f, availableNow: v }))}
            accessibilityLabel={t('search.availableNow')}
          />
        </View>
        <View style={styles.switchRow}>
          <Text variant="bodyLarge" style={styles.flex}>
            {t('search.preOrderOnly')}
          </Text>
          <Switch
            value={Boolean(filters.preOrderOnly)}
            onValueChange={(v) => setFilters((f) => ({ ...f, preOrderOnly: v }))}
            accessibilityLabel={t('search.preOrderOnly')}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sorts: { gap: spacing.xs },
  chip: { minHeight: 40, justifyContent: 'center' },
  btn: { minHeight: 44 },
  list: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
