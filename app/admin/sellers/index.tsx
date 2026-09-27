import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, Searchbar } from 'react-native-paper';
import { SELLER_STATUSES, type SellerStatus } from '@shared/constants';
import { normalizeText } from '@shared/text';
import { ChipSelector, EmptyState, ErrorState, LoadingState, Screen, StatusPill } from '@/components';
import { useAdminSellers } from '@/features/admin/api';
import { useLocalized } from '@/localization/useLocalized';
import { palette, spacing } from '@/theme';

export default function SellerManagement() {
  const { t } = useLocalized();
  const [status, setStatus] = useState<SellerStatus | 'all'>('approved');
  const [query, setQuery] = useState('');
  const sellers = useAdminSellers(status);
  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return (sellers.data ?? []).filter(
      (s) => !q || normalizeText(s.displayName).includes(q) || s.id.startsWith(query.trim()),
    );
  }, [sellers.data, query]);

  return (
    <Screen padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        refreshing={sellers.isRefetching}
        onRefresh={() => void sellers.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Searchbar
              value={query}
              onChangeText={setQuery}
              placeholder={t('admin.searchSellers')}
              style={styles.search}
            />
            <ChipSelector
              multiple={false}
              options={[
                { value: 'all', label: t('common.all') },
                ...SELLER_STATUSES.map((s) => ({ value: s, label: t(`sellerStatus.${s}`) })),
              ]}
              selected={[status]}
              onChange={([v]) => setStatus((v ?? 'all') as SellerStatus | 'all')}
            />
            {sellers.isLoading ? <LoadingState /> : null}
            {sellers.error && !sellers.data ? (
              <ErrorState error={sellers.error} onRetry={() => void sellers.refetch()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={sellers.data ? <EmptyState icon="chef-hat" title={t('admin.noSellers')} /> : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <List.Item
            title={item.displayName || item.id}
            description={`★ ${item.averageRating.toFixed(1)} (${item.reviewCount}) · ${t('seller.completedOrders', { count: item.orderCount })}`}
            right={() => (
              <StatusPill
                label={t(`sellerStatus.${item.status}`)}
                tone={
                  item.status === 'approved'
                    ? 'good'
                    : item.status === 'suspended' || item.status === 'rejected'
                      ? 'bad'
                      : 'info'
                }
              />
            )}
            onPress={() => router.push(`/admin/sellers/${item.id}`)}
            style={styles.item}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  search: { backgroundColor: palette.white },
  item: { backgroundColor: palette.white, borderRadius: 12, minHeight: 64 },
});
