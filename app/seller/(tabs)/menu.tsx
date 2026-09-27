import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, IconButton, Switch, Text } from 'react-native-paper';
import { getDishAvailability } from '@shared/availability';
import {
  AvailabilityBadge,
  DishImage,
  EmptyState,
  ErrorState,
  LoadingState,
  PriceDisplay,
  Screen,
  StatusPill,
} from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMyDishes, useQuickDishUpdate } from '@/features/dishes/api';
import { useLocalized } from '@/localization/useLocalized';
import { palette, radius, spacing } from '@/theme';

export default function SellerDishList() {
  const { t, pick } = useLocalized();
  const uid = useUid();
  const dishes = useMyDishes(uid);
  const quick = useQuickDishUpdate(uid);

  if (dishes.isLoading) return <LoadingState />;
  if (dishes.error && !dishes.data) return <ErrorState error={dishes.error} onRetry={() => void dishes.refetch()} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={dishes.data ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.content}
        refreshing={dishes.isRefetching}
        onRefresh={() => void dishes.refetch()}
        ListHeaderComponent={
          <View style={styles.headerRow}>
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
              icon="calendar"
              onPress={() => router.push('/seller/menus')}
              style={styles.flex}
              contentStyle={styles.btn}
            >
              {t('sellerMenu.dailyMenus')}
            </Button>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="food-outline" title={t('sellerMenu.noDishes')} message={t('sellerMenu.noDishesMessage')} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.thumb}>
                <DishImage uri={item.imageUrls[0]} categoryId={item.categoryId} />
              </View>
              <View style={styles.flex}>
                <Text variant="titleSmall" numberOfLines={1}>
                  {pick(item, 'name')}
                </Text>
                <PriceDisplay amount={item.price} variant="bodyLarge" />
                <View style={styles.badges}>
                  <AvailabilityBadge state={getDishAvailability(item)} quantity={item.availableQuantity} />
                  {item.isHidden ? <StatusPill label={t('sellerMenu.hiddenByAdmin')} tone="bad" /> : null}
                </View>
              </View>
              <IconButton
                icon="pencil"
                onPress={() => router.push(`/seller/dish/${item.id}`)}
                accessibilityLabel={t('common.edit')}
              />
            </View>
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.flex}>
                {t('sellerMenu.active')}
              </Text>
              <Switch
                value={item.isActive}
                onValueChange={(v) => quick.mutate({ id: item.id, changes: { isActive: v } })}
                accessibilityLabel={t('sellerMenu.active')}
              />
            </View>
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.flex}>
                {t('sellerMenu.quantity', { count: item.availableQuantity })}
              </Text>
              <IconButton
                icon="minus"
                mode="outlined"
                disabled={item.availableQuantity <= 0}
                onPress={() =>
                  quick.mutate({ id: item.id, changes: { availableQuantity: item.availableQuantity - 1 } })
                }
                accessibilityLabel={t('cart.decrease')}
              />
              <IconButton
                icon="plus"
                mode="outlined"
                disabled={item.availableQuantity >= 500}
                onPress={() =>
                  quick.mutate({ id: item.id, changes: { availableQuantity: item.availableQuantity + 1 } })
                }
                accessibilityLabel={t('cart.increase')}
              />
              <Button compact onPress={() => quick.mutate({ id: item.id, changes: { availableQuantity: 0 } })}>
                {t('sellerMenu.markSoldOut')}
              </Button>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  headerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden' },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  flex: { flex: 1 },
  btn: { minHeight: 48 },
});
