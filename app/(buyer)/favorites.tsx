import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { IconButton, List } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useFavorites, useToggleFavorite } from '@/features/favorites/api';
import { useLocalized } from '@/localization/useLocalized';
import { palette, spacing } from '@/theme';

export default function FavoritesScreen() {
  const { t } = useLocalized();
  const uid = useUid();
  const favorites = useFavorites(uid);
  const toggle = useToggleFavorite(uid);

  if (favorites.isLoading) return <LoadingState />;
  if (favorites.error && !favorites.data)
    return <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={favorites.data ?? []}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.content}
        refreshing={favorites.isRefetching}
        onRefresh={() => void favorites.refetch()}
        ListEmptyComponent={
          <EmptyState icon="heart-outline" title={t('favorites.emptyTitle')} message={t('favorites.emptyMessage')} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <List.Item
            title={item.title}
            description={item.targetType === 'seller' ? t('favorites.kitchen') : t('favorites.dish')}
            left={(p) => <List.Icon {...p} icon={item.targetType === 'seller' ? 'chef-hat' : 'food'} />}
            right={() => (
              <IconButton
                icon="heart-remove-outline"
                accessibilityLabel={t('favorites.remove')}
                onPress={() =>
                  toggle.mutate({
                    targetType: item.targetType,
                    targetId: item.targetId,
                    sellerId: item.sellerId,
                    title: item.title,
                    isFavorite: true,
                  })
                }
              />
            )}
            onPress={() =>
              router.push(item.targetType === 'seller' ? `/kitchen/${item.targetId}` : `/dish/${item.targetId}`)
            }
            style={styles.item}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  item: { backgroundColor: palette.white, borderRadius: 12, minHeight: 56 },
});
