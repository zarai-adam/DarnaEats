import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, List } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, Screen, StatusPill } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMyMenus } from '@/features/menus/api';
import { useLocalized } from '@/localization/useLocalized';
import { formatDateKey } from '@/utils/format';
import { palette, spacing } from '@/theme';

export default function SellerMenus() {
  const { t, language, pick } = useLocalized();
  const uid = useUid();
  const menus = useMyMenus(uid);
  if (menus.isLoading) return <LoadingState />;
  if (menus.error && !menus.data) return <ErrorState error={menus.error} onRetry={() => void menus.refetch()} />;
  return (
    <Screen padded={false}>
      <FlatList
        data={menus.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        refreshing={menus.isRefetching}
        onRefresh={() => void menus.refetch()}
        ListHeaderComponent={
          <Button
            mode="contained"
            icon="plus"
            onPress={() => router.push('/seller/menu-editor')}
            contentStyle={{ minHeight: 48 }}
            style={{ marginBottom: spacing.md }}
          >
            {t('sellerMenu.newMenu')}
          </Button>
        }
        ListEmptyComponent={
          <EmptyState icon="calendar-blank" title={t('sellerMenu.noMenus')} message={t('sellerMenu.noMenusMessage')} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <List.Item
            title={`${formatDateKey(item.date, language)} · ${pick(item, 'title')}`}
            description={t('sellerMenu.dishCount', { count: item.dishIds.length })}
            right={() => (
              <StatusPill
                label={t(`menuStatus.${item.status}`)}
                tone={item.status === 'published' ? 'good' : 'neutral'}
              />
            )}
            onPress={() => router.push({ pathname: '/seller/menu-editor', params: { id: item.id } })}
            style={styles.item}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  item: { backgroundColor: palette.white, borderRadius: 12, minHeight: 64 },
});
