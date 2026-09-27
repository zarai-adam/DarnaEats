import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import { ErrorState, LoadingState, RatingStars, ReasonDialog, Screen, SectionHeader, StatusPill } from '@/components';
import { useSellerApplication, useSellerDecision } from '@/features/admin/api';
import { useSellerEarnings } from '@/features/orders/api';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

export default function AdminSellerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLocalized();
  const data = useSellerApplication(id);
  const stats = useSellerEarnings(id ?? '');
  const decide = useSellerDecision();
  const [dialog, setDialog] = useState<'suspend' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (data.isLoading) return <LoadingState />;
  if (!data.data?.profile) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;
  const p = data.data.profile;

  const run = async (decision: 'suspend' | 'reactivate', reason?: string) => {
    try {
      await decide.mutateAsync({ sellerId: p.id, decision, ...(reason ? { reason } : {}) });
      setNotice(t('admin.decisionSaved'));
      void data.refetch();
    } catch (e) {
      setNotice(errorMessage(e, t));
    } finally {
      setDialog(null);
    }
  };

  return (
    <Screen scroll refreshing={data.isRefetching} onRefresh={() => void data.refetch()}>
      <View style={styles.row}>
        <Text variant="titleLarge" style={styles.flex}>
          {p.displayName}
        </Text>
        <StatusPill label={t(`sellerStatus.${p.status}`)} tone={p.status === 'approved' ? 'good' : 'bad'} />
      </View>
      <RatingStars rating={p.averageRating} count={p.reviewCount} />
      <View style={styles.card}>
        <Text variant="bodyMedium">{t('seller.completedOrders', { count: p.orderCount })}</Text>
        <Text variant="bodyMedium">
          {t('admin.pendingOrders')}: {stats.data?.pendingCount ?? '…'}
        </Text>
        <Text variant="bodyMedium">
          {t('admin.last30Days')}:{' '}
          {stats.data ? `${stats.data.month.count} · ${stats.data.month.total} ${t('common.currency')}` : '…'}
        </Text>
        <Text variant="bodySmall" style={styles.muted}>
          {t('admin.verifiedOn', { date: formatDate(p.verifiedAt, language) || '—' })}
        </Text>
      </View>
      <SectionHeader title={t('seller.story')} />
      <Text variant="bodyMedium">{p.story}</Text>
      <View style={styles.actions}>
        <Button mode="outlined" onPress={() => router.push(`/admin/verification/${p.id}`)}>
          {t('admin.viewApplication')}
        </Button>
        {p.status === 'approved' ? (
          <Button mode="outlined" onPress={() => router.push(`/kitchen/${p.id}`)}>
            {t('admin.viewStorefront')}
          </Button>
        ) : null}
        {p.status === 'approved' ? (
          <Button textColor={palette.danger} icon="pause-circle-outline" onPress={() => setDialog('suspend')}>
            {t('admin.suspend')}
          </Button>
        ) : null}
        {p.status === 'suspended' ? (
          <Button mode="contained" onPress={() => void run('reactivate')}>
            {t('admin.reactivate')}
          </Button>
        ) : null}
      </View>
      <ReasonDialog
        visible={dialog !== null}
        title={t('admin.decision.suspend')}
        message={t('admin.suspendMessage')}
        confirmLabel={t('admin.suspend')}
        destructive
        loading={decide.isPending}
        onDismiss={() => setDialog(null)}
        onConfirm={(reason) => void run('suspend', reason)}
      />
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={3000}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  muted: { color: palette.muted },
});
