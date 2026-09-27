import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { ErrorState, LoadingState, Screen, StatusPill } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMySellerProfile, useMyVerification, useSubmitApplication } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, spacing } from '@/theme';

export default function VerificationStatus() {
  const { t, language } = useLocalized();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  const verification = useMyVerification(uid);
  const submit = useSubmitApplication(uid);
  const [error, setError] = useState<string | null>(null);

  if (profile.isLoading || verification.isLoading) return <LoadingState />;
  if (!profile.data || !verification.data)
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  const p = profile.data;
  const v = verification.data;
  const canSubmit = p.status === 'draft' || p.status === 'rejected';

  const send = async () => {
    setError(null);
    try {
      const result = await submit.mutateAsync();
      if (!result.ok) {
        setError(t('onboarding.missingItems', { items: result.missing.map((m) => t(`requirement.${m}`)).join(', ') }));
        return;
      }
      track('seller_application_submitted');
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };

  return (
    <Screen
      scroll
      refreshing={profile.isRefetching}
      onRefresh={() => {
        void profile.refetch();
        void verification.refetch();
      }}
    >
      <View style={styles.card}>
        <Text variant="titleMedium">{t('onboarding.currentStatus')}</Text>
        <StatusPill
          label={t(`sellerStatus.${p.status}`)}
          tone={p.status === 'approved' ? 'good' : p.status === 'rejected' || p.status === 'suspended' ? 'bad' : 'info'}
        />
        <Text variant="bodyMedium">{t(`onboarding.statusExplain.${p.status}`)}</Text>
        {v.submittedAt ? (
          <Text variant="bodySmall" style={styles.muted}>
            {t('onboarding.submittedOn', { date: formatDate(v.submittedAt, language, true) })}
          </Text>
        ) : null}
        {v.reviewedAt ? (
          <Text variant="bodySmall" style={styles.muted}>
            {t('onboarding.reviewedOn', { date: formatDate(v.reviewedAt, language, true) })}
          </Text>
        ) : null}
        {v.rejectionReason ? (
          <Text variant="bodyMedium" style={styles.bad}>
            {v.rejectionReason}
          </Text>
        ) : null}
      </View>
      <Text variant="bodySmall" style={styles.muted}>
        {t('onboarding.privacyWhileReview')}
      </Text>
      {canSubmit ? (
        <>
          <Text variant="bodyMedium">{t('onboarding.submitConfirm')}</Text>
          <Button
            mode="contained"
            icon="send"
            onPress={() => void send()}
            loading={submit.isPending}
            disabled={submit.isPending}
            contentStyle={styles.btn}
          >
            {t('onboarding.submit')}
          </Button>
          <Button onPress={() => router.replace('/seller/onboarding')}>{t('onboarding.editApplication')}</Button>
        </>
      ) : null}
      {p.status === 'approved' ? (
        <Button mode="contained" onPress={() => router.replace('/seller/dashboard')} contentStyle={styles.btn}>
          {t('onboarding.goToDashboard')}
        </Button>
      ) : null}
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  btn: { minHeight: 50 },
  muted: { color: palette.muted },
  bad: { color: palette.danger },
});
