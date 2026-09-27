import { useInfiniteQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { DishCard, EmptyState, ErrorState, LoadingState, Screen } from '@/components';
import { useCategories } from '@/features/catalog/api';
import { useLocalized } from '@/localization/useLocalized';
import { searchProvider } from '@/services/search';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, pick } = useLocalized();
  const governorateId = useSettingsStore((s) => s.preferredGovernorateId);
  const categories = useCategories();
  const category = categories.data?.find((c) => c.id === id);
  const results = useInfiniteQuery({
    queryKey: ['category', id, governorateId],
    initialPageParam: null as Awaited<ReturnType<typeof searchProvider.searchDishes>>['cursor'],
    queryFn: ({ pageParam }) =>
      searchProvider.searchDishes({ filters: { categoryId: id, governorateId }, cursor: pageParam, pageSize: 20 }),
    getNextPageParam: (last) => (last.hasMore ? last.cursor : undefined),
  });
  const items = results.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: category ? pick(category, 'name') : t('categories.title') }} />
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
          refreshing={results.isRefetching}
          onRefresh={() => void results.refetch()}
          onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && void results.fetchNextPage()}
          ListEmptyComponent={<EmptyState title={t('categories.empty')} />}
          ListFooterComponent={results.isFetchingNextPage ? <LoadingState /> : null}
          renderItem={({ item }) => <DishCard dish={item} onPress={() => router.push(`/dish/${item.id}`)} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { padding: spacing.lg, flexGrow: 1 } });
