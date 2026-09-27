import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, RatingStars, Screen, StatusPill } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMyReceivedReviews, useRespondToReview } from '@/features/reviews/api';
import { useLocalized } from '@/localization/useLocalized';
import type { Review } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

function ResponseBox({ review, uid }: { review: Review; uid: string }) {
  const { t } = useLocalized();
  const respond = useRespondToReview(uid);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: spacing.xs }}>
      <TextInput
        mode="outlined"
        dense
        label={t('reviews.yourResponse')}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={600}
        style={{ backgroundColor: palette.white }}
      />
      <Text variant="bodySmall" style={{ color: palette.muted }}>
        {t('reviews.oneResponse')}
      </Text>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained-tonal"
        disabled={text.trim().length < 2 || respond.isPending}
        loading={respond.isPending}
        onPress={() =>
          respond
            .mutateAsync({ reviewId: review.id, response: text.trim() })
            .catch((e: unknown) => setError(errorMessage(e, t)))
        }
      >
        {t('reviews.respond')}
      </Button>
    </View>
  );
}

export default function SellerReviews() {
  const { t, language } = useLocalized();
  const uid = useUid();
  const reviews = useMyReceivedReviews(uid);
  const items = reviews.data?.pages.flatMap((p) => p.items) ?? [];
  if (reviews.isLoading) return <LoadingState />;
  if (reviews.error && !reviews.data)
    return <ErrorState error={reviews.error} onRetry={() => void reviews.refetch()} />;
  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        refreshing={reviews.isRefetching}
        onRefresh={() => void reviews.refetch()}
        onEndReached={() => reviews.hasNextPage && void reviews.fetchNextPage()}
        ListEmptyComponent={<EmptyState icon="star-outline" title={t('reviews.noReviewsYet')} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.between}>
              <Text variant="titleSmall">{item.reviewerName || t('reviews.anonymous')}</Text>
              <Text variant="bodySmall" style={styles.muted}>
                {formatDate(item.createdAt, language)}
              </Text>
            </View>
            <RatingStars rating={item.rating} count={1} size={14} />
            {item.status !== 'visible' ? (
              <StatusPill label={t(`reviewStatus.${item.status}`)} tone={item.status === 'removed' ? 'bad' : 'warn'} />
            ) : null}
            {item.comment ? <Text variant="bodyMedium">{item.comment}</Text> : null}
            {item.sellerResponse ? (
              <View style={styles.response}>
                <Text variant="labelMedium">{t('reviews.sellerResponse')}</Text>
                <Text variant="bodyMedium">{item.sellerResponse}</Text>
              </View>
            ) : item.status !== 'removed' ? (
              <ResponseBox review={item} uid={uid} />
            ) : null}
          </View>
        )}
      />
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
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  response: { backgroundColor: palette.cream, borderRadius: radius.sm, padding: spacing.sm, gap: 2 },
  muted: { color: palette.muted },
});
