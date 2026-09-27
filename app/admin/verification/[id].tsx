import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import type { SellerDecision } from '@shared/sellerApproval';
import { ErrorState, LoadingState, ReasonDialog, Screen, SectionHeader, StatusPill } from '@/components';
import { useSellerApplication, useSellerDecision } from '@/features/admin/api';
import { useServiceAreas } from '@/features/catalog/api';
import { useLocalized } from '@/localization/useLocalized';
import { api } from '@/services/firebase/callables';
import { readPrivateImageAsDataUri } from '@/services/firebase/storage';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

/**
 * Application review. The identity document is loaded on explicit request,
 * through the SDK (Storage rules enforced), and each access is audited.
 */
export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, pick } = useLocalized();
  const application = useSellerApplication(id);
  const decide = useSellerDecision();
  const areas = useServiceAreas(true);
  const [dialog, setDialog] = useState<SellerDecision | null>(null);
  const [notes, setNotes] = useState('');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (application.isLoading) return <LoadingState />;
  if (!application.data?.profile)
    return <ErrorState error={application.error} onRetry={() => void application.refetch()} />;
  const { profile, verification, user } = application.data;
  const area = areas.data?.find((a) => a.id === profile.serviceAreaId);

  const run = async (decision: SellerDecision, reason?: string) => {
    try {
      await decide.mutateAsync({
        sellerId: profile.id,
        decision,
        ...(reason ? { reason } : {}),
        ...(notes.trim() ? { adminNotes: notes.trim() } : {}),
      });
      setNotice(t('admin.decisionSaved'));
      void application.refetch();
    } catch (e) {
      setNotice(errorMessage(e, t));
    } finally {
      setDialog(null);
    }
  };

  const viewDocument = async () => {
    if (!verification?.identityDocumentPath) return;
    try {
      await api.adminLogVerificationAccess({ sellerId: profile.id });
      setDocumentUri(await readPrivateImageAsDataUri(verification.identityDocumentPath));
    } catch (e) {
      setNotice(errorMessage(e, t));
    }
  };

  const reviewable = profile.status === 'submitted' || profile.status === 'under_review';

  return (
    <Screen scroll refreshing={application.isRefetching} onRefresh={() => void application.refetch()}>
      <View style={styles.between}>
        <Text variant="titleLarge" style={styles.flex}>
          {profile.displayName}
        </Text>
        <StatusPill label={t(`sellerStatus.${profile.status}`)} tone="info" />
      </View>

      <SectionHeader title={t('admin.applicant')} />
      <View style={styles.card}>
        <Text variant="bodyMedium">
          {t('onboarding.legalName')}: {verification?.legalFullName || '—'}
        </Text>
        <Text variant="bodyMedium">
          {t('auth.phoneNumber')}: {user?.phoneNumber ?? '—'} ·{' '}
          {verification?.phoneVerified ? t('admin.verified') : t('admin.notVerified')}
        </Text>
        <Text variant="bodyMedium">
          {t('auth.email')}: {user?.email ?? '—'}
        </Text>
        <Text variant="bodyMedium">
          {t('location.area')}: {area ? pick(area, 'name') : '—'}
        </Text>
        <Text variant="bodyMedium">
          {t('sellerForm.pickupAddress')}: {application.data.private?.pickupAddress || '—'}
        </Text>
        <Text variant="bodyMedium">
          {t('onboarding.documentType')}:{' '}
          {verification?.identityDocumentType ? t(`documentType.${verification.identityDocumentType}`) : '—'}
        </Text>
        <Text variant="bodyMedium">
          {t('hygiene.title')}: {verification?.hygieneAgreementAccepted ? '✓' : '✗'} · {t('foodSafety.title')}:{' '}
          {verification?.foodSafetyAgreementAccepted ? '✓' : '✗'}
        </Text>
        {verification?.submittedAt ? (
          <Text variant="bodySmall" style={styles.muted}>
            {t('onboarding.submittedOn', { date: formatDate(verification.submittedAt, language, true) })}
          </Text>
        ) : null}
      </View>

      <SectionHeader title={t('seller.story')} />
      <Text variant="bodyMedium">{profile.story}</Text>
      <Text variant="bodySmall">
        {profile.specialties.map((s) => t(`specialty.${s}`, { defaultValue: s })).join(' · ')}
      </Text>

      <SectionHeader title={t('onboarding.kitchenPhoto')} />
      {profile.kitchenPhotoUrl ? (
        <Image
          source={{ uri: profile.kitchenPhotoUrl }}
          style={styles.photo}
          contentFit="cover"
          accessibilityLabel={t('onboarding.kitchenPhoto')}
        />
      ) : (
        <Text style={styles.muted}>—</Text>
      )}

      <SectionHeader title={t('onboarding.documentPhoto')} />
      {documentUri ? (
        <Image
          source={{ uri: documentUri }}
          style={styles.photo}
          contentFit="contain"
          accessibilityLabel={t('onboarding.documentPhoto')}
        />
      ) : verification?.identityDocumentPath ? (
        <Button mode="outlined" icon="eye-lock-outline" onPress={() => void viewDocument()}>
          {t('admin.viewDocument')}
        </Button>
      ) : (
        <Text style={styles.muted}>—</Text>
      )}
      <Text variant="bodySmall" style={styles.muted}>
        {t('admin.documentAudited')}
      </Text>

      <SectionHeader title={t('admin.internalNotes')} />
      <TextInput
        mode="outlined"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={2000}
        placeholder={verification?.adminNotes ?? ''}
        style={styles.input}
      />

      <View style={styles.actions}>
        {profile.status === 'submitted' ? (
          <Button mode="outlined" onPress={() => void run('start_review')}>
            {t('admin.startReview')}
          </Button>
        ) : null}
        {reviewable ? (
          <>
            <Button
              mode="contained"
              icon="check"
              onPress={() => void run('approve')}
              loading={decide.isPending}
              contentStyle={styles.btn}
            >
              {t('admin.approve')}
            </Button>
            <Button
              mode="outlined"
              icon="pencil"
              onPress={() => setDialog('request_changes')}
              contentStyle={styles.btn}
            >
              {t('admin.requestChanges')}
            </Button>
            <Button textColor={palette.danger} icon="close" onPress={() => setDialog('reject')}>
              {t('admin.reject')}
            </Button>
          </>
        ) : null}
        {profile.status === 'approved' ? (
          <Button textColor={palette.danger} icon="pause-circle-outline" onPress={() => setDialog('suspend')}>
            {t('admin.suspend')}
          </Button>
        ) : null}
        {profile.status === 'suspended' ? (
          <Button mode="contained" onPress={() => void run('reactivate')}>
            {t('admin.reactivate')}
          </Button>
        ) : null}
      </View>

      <ReasonDialog
        visible={dialog !== null}
        title={dialog ? t(`admin.decision.${dialog}`) : ''}
        message={t('admin.reasonVisibleToSeller')}
        confirmLabel={t('common.confirm')}
        destructive={dialog === 'reject' || dialog === 'suspend'}
        loading={decide.isPending}
        onDismiss={() => setDialog(null)}
        onConfirm={(reason) => dialog && void run(dialog, reason)}
      />
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={3500}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  photo: { height: 240, borderRadius: radius.md, backgroundColor: palette.beige },
  input: { backgroundColor: palette.white },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  btn: { minHeight: 48 },
  muted: { color: palette.muted },
});
