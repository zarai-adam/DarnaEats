import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { ErrorState, LoadingState, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMySellerPrivate, useMySellerProfile } from '@/features/sellers/api';
import { ServiceAreaForm } from '@/features/sellers/components/ServiceAreaForm';
import { useLocalized } from '@/localization/useLocalized';

export default function Availability() {
  const { t } = useLocalized();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  const priv = useMySellerPrivate(uid);
  if (profile.isLoading || priv.isLoading) return <LoadingState />;
  if (!profile.data) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  return (
    <Screen scroll>
      <Text variant="bodyMedium">{t('sellerProfile.availabilityIntro')}</Text>
      <ServiceAreaForm seller={profile.data} privateData={priv.data ?? null} onSaved={() => router.back()} />
    </Screen>
  );
}
