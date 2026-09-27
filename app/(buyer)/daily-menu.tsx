import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, PriceDisplay, Screen } from '@/components';
import { useServiceAreas } from '@/features/catalog/api';
import { useTodayMenus } from '@/features/menus/api';
import { useLocalized } from '@/localization/useLocalized';
import { palette, radius, spacing } from '@/theme';

export default function DailyMenuFeed() {
  const { t, pick } = useLocalized();
  const menus = useTodayMenus(50);
  const areas = useServiceAreas(true);

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
          <Text variant="bodyMedium" style={styles.muted}>
            {t('dailyMenu.intro')}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState icon="calendar-blank" title={t('dailyMenu.none')} message={t('dailyMenu.noneMessage')} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const area = areas.data?.find((a) => a.id === item.serviceAreaId);
          return (
            <View style={styles.card}>
              <Pressable
                onPress={() => router.push(`/kitchen/${item.sellerId}`)}
                accessibilityRole="link"
                style={styles.head}
              >
                <Text variant="titleMedium">{item.sellerName}</Text>
                {area ? (
                  <Text variant="bodySmall" style={styles.muted}>
                    {t('seller.approxArea', { area: pick(area, 'name') })}
                  </Text>
                ) : null}
              </Pressable>
              <Text variant="titleSmall">{pick(item, 'title')}</Text>
              {pick(item, 'description') ? <Text variant="bodyMedium">{pick(item, 'description')}</Text> : null}
              {(item.dishSummaries ?? []).map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => router.push(`/dish/${d.id}`)}
                  style={styles.line}
                  accessibilityRole="button"
                  accessibilityLabel={pick(d, 'name')}
                >
                  <Text variant="bodyLarge" style={styles.flex}>
                    {pick(d, 'name')}
                  </Text>
                  <PriceDisplay amount={d.price} variant="bodyLarge" />
                </Pressable>
              ))}
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  head: { minHeight: 44, justifyContent: 'center' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
