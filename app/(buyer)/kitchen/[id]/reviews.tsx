import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, RatingStars, ReasonDialog, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useFlagReview, useSellerReviews } from '@/features/reviews/api';
import { useSellerProfile } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

export default function SellerReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLocalized();
  const uid = useUid();
  const seller = useSellerProfile(id);
  const reviews = useSellerReviews(id);
  const flag = useFlagReview();
  const [flagging, setFlagging] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
        ListHeaderComponent={
          seller.data ? (
            <View style={styles.header}>
              <Text variant="titleLarge">{seller.data.displayName}</Text>
              <RatingStars rating={seller.data.averageRating} count={seller.data.reviewCount} size={20} />
              <Text variant="bodySmall" style={styles.muted}>
                {t('reviews.verifiedOnly')}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState icon="star-outline" title={t('reviews.noReviewsYet')} />}
        onEndReached={() => reviews.hasNextPage && !reviews.isFetchingNextPage && void reviews.fetchNextPage()}
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
            {item.comment ? <Text variant="bodyMedium">{item.comment}</Text> : null}
            {item.sellerResponse ? (
              <View style={styles.response}>
                <Text variant="labelMedium">{t('reviews.sellerResponse')}</Text>
                <Text variant="bodyMedium">{item.sellerResponse}</Text>
              </View>
            ) : null}
            {item.reviewerId !== uid ? (
              <Button
                compact
                icon="flag-outline"
                onPress={() => setFlagging(item.id)}
                style={styles.flag}
                textColor="#8F4A3A"
              >
                {t('reviews.flag')}
              </Button>
            ) : null}
          </View>
        )}
      />
      <ReasonDialog
        visible={Boolean(flagging)}
        title={t('reviews.flagTitle')}
        message={t('reviews.flagMessage')}
        confirmLabel={t('reviews.flag')}
        loading={flag.isPending}
        onDismiss={() => setFlagging(null)}
        onConfirm={(reason) => {
          if (!flagging) return;
          flag
            .mutateAsync({ reviewId: flagging, reason: 'inappropriate_content', description: reason })
            .then(() => setNotice(t('reviews.flagged')))
            .catch((e: unknown) => setNotice(errorMessage(e, t)))
            .finally(() => setFlagging(null));
        }}
      />
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={3500}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  header: { gap: 6, marginBottom: spacing.md },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  response: {
    backgroundColor: palette.cream,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 2,
    borderStartWidth: 3,
    borderStartColor: palette.olive,
  },
  flag: { alignSelf: 'flex-end' },
  muted: { color: palette.muted },
});
