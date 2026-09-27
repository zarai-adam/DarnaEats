import { router } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { ErrorState, ImageUploadField, LoadingState, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import {
  useMySellerProfile,
  useMyVerification,
  useUpdateSellerProfile,
  useUpdateVerification,
} from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { uploadPublicImage } from '@/services/firebase/storage';

/** Kitchen photo (shown on the storefront once approved) and optional profile photo. */
export default function OnboardingKitchen() {
  const { t } = useLocalized();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  const verification = useMyVerification(uid);
  const updateProfile = useUpdateSellerProfile(uid);
  const updateVerification = useUpdateVerification(uid);

  if (profile.isLoading || verification.isLoading) return <LoadingState />;
  if (!profile.data || !verification.data)
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;

  return (
    <Screen scroll>
      <Text variant="bodyMedium">{t('onboarding.kitchenIntro')}</Text>
      <ImageUploadField
        label={t('onboarding.kitchenPhoto')}
        description={t('onboarding.kitchenPhotoHelp')}
        previewUri={profile.data.kitchenPhotoUrl}
        hasValue={Boolean(verification.data.kitchenPhotoPath)}
        upload={async (localUri) => {
          const { path, url } = await uploadPublicImage(`sellers/${uid}/kitchen`, localUri);
          await updateVerification.mutateAsync({ kitchenPhotoPath: path });
          await updateProfile.mutateAsync({ kitchenPhotoUrl: url });
        }}
      />
      <ImageUploadField
        label={t('onboarding.profilePhoto')}
        description={t('onboarding.profilePhotoHelp')}
        previewUri={profile.data.profilePhotoUrl}
        hasValue={Boolean(profile.data.profilePhotoUrl)}
        upload={async (localUri) => {
          const { url } = await uploadPublicImage(`sellers/${uid}/profile`, localUri);
          await updateProfile.mutateAsync({ profilePhotoUrl: url });
        }}
      />
      <Button mode="contained" onPress={() => router.back()} contentStyle={{ minHeight: 48 }}>
        {t('common.done')}
      </Button>
    </Screen>
  );
}
