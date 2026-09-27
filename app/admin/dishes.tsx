import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import {
  ChipSelector,
  DishImage,
  EmptyState,
  ErrorState,
  LoadingState,
  PriceDisplay,
  ReasonDialog,
  Screen,
  StatusPill,
} from '@/components';
import { useAdminDishes, useSetDishHidden } from '@/features/admin/api';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { palette, radius, spacing } from '@/theme';

export default function DishModeration() {
  const { t, pick } = useLocalized();
  const [filter, setFilter] = useState<'recent' | 'hidden'>('recent');
  const dishes = useAdminDishes(filter);
  const setHidden = useSetDishHidden();
  const [pending, setPending] = useState<{ id: string; hidden: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <Screen padded={false}>
      <FlatList
        data={dishes.data ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.content}
        refreshing={dishes.isRefetching}
        onRefresh={() => void dishes.refetch()}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <ChipSelector
              multiple={false}
              options={[
                { value: 'recent', label: t('admin.recentDishes') },
                { value: 'hidden', label: t('admin.hiddenDishes') },
              ]}
              selected={[filter]}
              onChange={([v]) => setFilter((v ?? 'recent') as 'recent' | 'hidden')}
            />
            {dishes.isLoading ? <LoadingState /> : null}
            {dishes.error && !dishes.data ? (
              <ErrorState error={dishes.error} onRetry={() => void dishes.refetch()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={dishes.data ? <EmptyState title={t('admin.noDishes')} /> : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.thumb}>
                <DishImage uri={item.imageUrls[0]} categoryId={item.categoryId} />
              </View>
              <View style={styles.flex}>
                <Text variant="titleSmall">{pick(item, 'name')}</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {item.sellerName ?? item.sellerId}
                </Text>
                <PriceDisplay amount={item.price} variant="bodyMedium" />
              </View>
              {item.isHidden ? <StatusPill label={t('admin.hidden')} tone="bad" /> : null}
            </View>
            {item.hiddenReason ? (
              <Text variant="bodySmall">
                {t('common.reason')}: {item.hiddenReason}
              </Text>
            ) : null}
            <Button
              textColor={item.isHidden ? undefined : palette.danger}
              onPress={() => setPending({ id: item.id, hidden: !item.isHidden })}
            >
              {item.isHidden ? t('admin.unhideDish') : t('admin.hideDish')}
            </Button>
          </View>
        )}
      />
      <ReasonDialog
        visible={pending !== null}
        title={pending?.hidden ? t('admin.hideDish') : t('admin.unhideDish')}
        confirmLabel={t('common.confirm')}
        destructive={pending?.hidden}
        loading={setHidden.isPending}
        onDismiss={() => setPending(null)}
        onConfirm={(reason) =>
          pending &&
          void setHidden
            .mutateAsync({ dishId: pending.id, hidden: pending.hidden, reason })
            .then(() => setNotice(t('common.saved')))
            .catch((e: unknown) => setNotice(errorMessage(e, t)))
            .finally(() => setPending(null))
        }
      />
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={3000}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden' },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
