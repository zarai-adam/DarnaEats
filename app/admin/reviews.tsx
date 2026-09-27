import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import type { ReviewStatus } from '@shared/constants';
import { ChipSelector, EmptyState, ErrorState, LoadingState, RatingStars, ReasonDialog, Screen } from '@/components';
import { useAdminReviews, useModerateReview } from '@/features/admin/api';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

type ModerationAction = 'remove' | 'restore' | 'dismiss_flag';

export default function ReviewModeration() {
  const { t, language } = useLocalized();
  const [status, setStatus] = useState<ReviewStatus>('flagged');
  const reviews = useAdminReviews(status);
  const moderate = useModerateReview();
  const [pending, setPending] = useState<{ id: string; action: ModerationAction } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const items = reviews.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        refreshing={reviews.isRefetching}
        onRefresh={() => void reviews.refetch()}
        onEndReached={() => reviews.hasNextPage && void reviews.fetchNextPage()}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <ChipSelector
              multiple={false}
              options={(['flagged', 'visible', 'removed'] as const).map((s) => ({
                value: s,
                label: t(`reviewStatus.${s}`),
              }))}
              selected={[status]}
              onChange={([v]) => setStatus((v ?? 'flagged') as ReviewStatus)}
            />
            {reviews.isLoading ? <LoadingState /> : null}
            {reviews.error && !reviews.data ? (
              <ErrorState error={reviews.error} onRetry={() => void reviews.refetch()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={reviews.data ? <EmptyState icon="check-all" title={t('admin.noReviews')} /> : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <RatingStars rating={item.rating} count={1} size={14} />
            <Text variant="bodyMedium">{item.comment || '—'}</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {t('admin.sellerId')}: {item.sellerId} · {formatDate(item.createdAt, language)}
            </Text>
            {item.moderationReason ? (
              <Text variant="bodySmall">
                {t('admin.lastModeration')}: {item.moderationReason}
              </Text>
            ) : null}
            <View style={styles.row}>
              {item.status !== 'removed' ? (
                <Button textColor={palette.danger} onPress={() => setPending({ id: item.id, action: 'remove' })}>
                  {t('admin.removeReview')}
                </Button>
              ) : null}
              {item.status === 'removed' ? (
                <Button onPress={() => setPending({ id: item.id, action: 'restore' })}>
                  {t('admin.restoreReview')}
                </Button>
              ) : null}
              {item.status === 'flagged' ? (
                <Button onPress={() => setPending({ id: item.id, action: 'dismiss_flag' })}>
                  {t('admin.dismissFlag')}
                </Button>
              ) : null}
            </View>
          </View>
        )}
      />
      <ReasonDialog
        visible={pending !== null}
        title={pending ? t(`admin.reviewAction.${pending.action}`) : ''}
        confirmLabel={t('common.confirm')}
        destructive={pending?.action === 'remove'}
        loading={moderate.isPending}
        onDismiss={() => setPending(null)}
        onConfirm={(reason) =>
          pending &&
          void moderate
            .mutateAsync({ reviewId: pending.id, action: pending.action, reason })
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  muted: { color: palette.muted },
});
