import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, List, Text } from 'react-native-paper';
import { missingApplicationRequirements } from '@shared/sellerApproval';
import { DirectionalIcon, ErrorState, LoadingState, Screen, StatusPill } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMySellerProfile, useMyVerification } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { useSettingsStore } from '@/store/settingsStore';
import { palette, spacing } from '@/theme';

/**
 * Seller onboarding hub. Before approval, sellers can only manage their
 * application here; nothing about them is public.
 */
export default function OnboardingHub() {
  const { t } = useLocalized();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const profile = useMySellerProfile(uid);
  const verification = useMyVerification(uid);
  const setMode = useSettingsStore((s) => s.setMode);

  if (profile.isLoading || verification.isLoading) return <LoadingState />;
  if (!profile.data || !verification.data)
    return (
      <ErrorState
        error={profile.error ?? verification.error}
        onRetry={() => {
          void profile.refetch();
          void verification.refetch();
        }}
      />
    );

  const p = profile.data;
  const v = verification.data;
  if (p.status === 'approved') return <Redirect href="/seller/dashboard" />;
  const editable = p.status === 'draft' || p.status === 'rejected';
  const missing = missingApplicationRequirements({
    displayName: p.displayName,
    story: p.story,
    specialties: p.specialties,
    serviceAreaId: p.serviceAreaId,
    kitchenPhotoPath: v.kitchenPhotoPath,
    identityDocumentPath: v.identityDocumentPath,
    identityDocumentType: v.identityDocumentType,
    legalFullName: v.legalFullName,
    phoneVerified: Boolean(user?.phoneNumber),
    hygieneAgreementAccepted: v.hygieneAgreementAccepted,
    foodSafetyAgreementAccepted: v.foodSafetyAgreementAccepted,
  });

  const steps: { key: string; done: boolean; route: Href }[] = [
    {
      key: 'onboarding.stepProfile',
      done: !missing.some((m) => ['displayName', 'story', 'specialties', 'serviceAreaId'].includes(m)),
      route: '/seller/onboarding/profile',
    },
    {
      key: 'onboarding.stepIdentity',
      done: !missing.some((m) => ['legalFullName', 'identityDocumentPath', 'identityDocumentType'].includes(m)),
      route: '/seller/onboarding/identity',
    },
    { key: 'onboarding.stepKitchen', done: !missing.includes('kitchenPhotoPath'), route: '/seller/onboarding/kitchen' },
    {
      key: 'onboarding.stepPhone',
      done: !missing.includes('phoneVerified'),
      route: { pathname: '/phone', params: { mode: 'link' } },
    },
    {
      key: 'onboarding.stepAgreements',
      done: !missing.some((m) => m === 'hygieneAgreementAccepted' || m === 'foodSafetyAgreementAccepted'),
      route: '/seller/onboarding/agreements',
    },
  ];

  return (
    <Screen
      scroll
      refreshing={profile.isRefetching}
      onRefresh={() => {
        void profile.refetch();
        void verification.refetch();
      }}
    >
      <View style={styles.hero}>
        <MaterialCommunityIcons name="chef-hat" size={40} color={palette.olive} />
        <Text variant="titleLarge" accessibilityRole="header">
          {t('onboarding.welcome')}
        </Text>
        <Text variant="bodyMedium" style={styles.center}>
          {t('onboarding.intro')}
        </Text>
        <StatusPill
          label={t(`sellerStatus.${p.status}`)}
          tone={p.status === 'rejected' || p.status === 'suspended' ? 'bad' : p.status === 'draft' ? 'neutral' : 'info'}
        />
      </View>

      {p.status === 'suspended' ? (
        <Text variant="bodyMedium" style={styles.bad}>
          {t('onboarding.suspendedMessage')}
        </Text>
      ) : null}
      {p.status === 'submitted' || p.status === 'under_review' ? (
        <Text variant="bodyMedium">{t('onboarding.underReviewMessage')}</Text>
      ) : null}
      {v.rejectionReason && editable ? (
        <View style={styles.reason}>
          <Text variant="titleSmall">
            {v.status === 'changes_requested' ? t('onboarding.changesRequested') : t('onboarding.rejected')}
          </Text>
          <Text variant="bodyMedium">{v.rejectionReason}</Text>
        </View>
      ) : null}

      {editable ? (
        <>
          {steps.map((step, i) => (
            <List.Item
              key={step.key}
              title={`${i + 1}. ${t(step.key)}`}
              description={step.done ? t('onboarding.done') : t('onboarding.todo')}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={step.done ? 'check-circle' : 'circle-outline'}
                  color={step.done ? palette.olive : palette.muted}
                />
              )}
              right={() => <DirectionalIcon name="chevron-right" size={24} color={palette.muted} />}
              onPress={() => router.push(step.route)}
              style={styles.item}
              accessibilityLabel={`${t(step.key)}, ${step.done ? t('onboarding.done') : t('onboarding.todo')}`}
            />
          ))}
          <Button
            mode="contained"
            icon="send"
            disabled={missing.length > 0}
            onPress={() => router.push('/seller/onboarding/status')}
            contentStyle={styles.btn}
          >
            {t('onboarding.reviewAndSubmit')}
          </Button>
          {missing.length > 0 ? (
            <Text variant="bodySmall" style={styles.muted}>
              {t('onboarding.completeAllSteps')}
            </Text>
          ) : null}
        </>
      ) : (
        <Button mode="outlined" onPress={() => router.push('/seller/onboarding/status')} contentStyle={styles.btn}>
          {t('onboarding.viewStatus')}
        </Button>
      )}

      <Button
        icon="food-fork-drink"
        onPress={() => {
          setMode('buyer');
          router.replace('/');
        }}
      >
        {t('profile.switchToBuyer')}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  center: { textAlign: 'center' },
  item: { backgroundColor: palette.white, borderRadius: 12, minHeight: 64, marginBottom: spacing.xs },
  reason: { backgroundColor: '#F4D7D3', padding: spacing.md, borderRadius: 12, gap: 4 },
  btn: { minHeight: 50 },
  muted: { color: palette.muted, textAlign: 'center' },
  bad: { color: palette.danger },
});
