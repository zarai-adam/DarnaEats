import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMySellerPrivate, useMySellerProfile } from '@/features/sellers/api';
import { ServiceAreaForm } from '@/features/sellers/components/ServiceAreaForm';
import { StorefrontForm } from '@/features/sellers/components/StorefrontForm';
import { useLocalized } from '@/localization/useLocalized';
import { useState } from 'react';

export default function OnboardingProfile() {
  const { t } = useLocalized();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  const priv = useMySellerPrivate(uid);
  const [step, setStep] = useState<'story' | 'area'>('story');

  if (profile.isLoading || priv.isLoading) return <LoadingState />;
  if (!profile.data) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;

  return (
    <Screen scroll>
      {step === 'story' ? (
        <>
          <Text variant="bodyMedium">{t('onboarding.profileIntro')}</Text>
          <StorefrontForm
            seller={profile.data}
            submitLabel={t('common.next')}
            onSaved={() => {
              void profile.refetch();
              setStep('area');
            }}
          />
        </>
      ) : (
        <>
          <SectionHeader title={t('onboarding.serviceArea')} />
          <ServiceAreaForm
            seller={profile.data}
            privateData={priv.data ?? null}
            submitLabel={t('common.saveAndContinue')}
            onSaved={() => router.back()}
          />
        </>
      )}
    </Screen>
  );
}
