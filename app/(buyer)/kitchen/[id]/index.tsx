import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, ReportButton, Screen, StorefrontView } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useStartConversation } from '@/features/chat/api';
import { useFavorites, useToggleFavorite, favoriteId } from '@/features/favorites/api';
import { useSellerProfile } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { spacing } from '@/theme';

export default function KitchenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocalized();
  const { user, profile } = useAuth();
  const uid = user?.uid ?? '';
  const seller = useSellerProfile(id);
  const favorites = useFavorites(uid);
  const toggle = useToggleFavorite(uid);
  const startChat = useStartConversation();
  const isFavorite = Boolean(favorites.data?.some((f) => f.id === favoriteId(uid, 'seller', id ?? '')));

  useEffect(() => {
    if (id) track('seller_viewed', { seller_id: id });
  }, [id]);

  if (seller.isLoading) return <LoadingState />;
  if (seller.error && !seller.data) return <ErrorState error={seller.error} onRetry={() => void seller.refetch()} />;
  if (!seller.data || seller.data.status !== 'approved')
    return <EmptyState icon="store-off-outline" title={t('seller.unavailable')} />;
  const s = seller.data;
  const isMe = s.id === uid;

  return (
    <Screen scroll refreshing={seller.isRefetching} onRefresh={() => void seller.refetch()}>
      <StorefrontView
        seller={s}
        actions={
          <View style={styles.actions}>
            {!isMe ? (
              <Button
                mode="contained-tonal"
                icon="chat-outline"
                loading={startChat.isPending}
                onPress={() =>
                  void startChat
                    .mutateAsync({
                      buyerId: uid,
                      buyerName: profile?.displayName ?? '',
                      sellerId: s.id,
                      sellerName: s.displayName,
                    })
                    .then((cid) => router.push(`/chat/${cid}`))
                }
                contentStyle={styles.btn}
              >
                {t('chat.message')}
              </Button>
            ) : null}
            <Button
              mode="outlined"
              icon={isFavorite ? 'heart' : 'heart-outline'}
              onPress={() =>
                toggle.mutate({
                  targetType: 'seller',
                  targetId: s.id,
                  sellerId: s.id,
                  title: s.displayName,
                  isFavorite,
                })
              }
              contentStyle={styles.btn}
              accessibilityState={{ selected: isFavorite }}
            >
              {isFavorite ? t('favorites.saved') : t('favorites.save')}
            </Button>
            {!isMe ? <ReportButton targetType="seller" targetId={s.id} /> : null}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  btn: { minHeight: 44 },
});
