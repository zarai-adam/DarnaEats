import { router } from 'expo-router';
import { ErrorState, ImageUploadField, LoadingState, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMySellerProfile, useUpdateSellerProfile } from '@/features/sellers/api';
import { StorefrontForm } from '@/features/sellers/components/StorefrontForm';
import { useLocalized } from '@/localization/useLocalized';
import { uploadPublicImage } from '@/services/firebase/storage';

export default function StorefrontEditor() {
  const { t } = useLocalized();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  const update = useUpdateSellerProfile(uid);
  if (profile.isLoading) return <LoadingState />;
  if (!profile.data) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  return (
    <Screen scroll>
      <ImageUploadField
        label={t('onboarding.profilePhoto')}
        previewUri={profile.data.profilePhotoUrl}
        hasValue={Boolean(profile.data.profilePhotoUrl)}
        upload={async (uri) => {
          const { url } = await uploadPublicImage(`sellers/${uid}/profile`, uri);
          await update.mutateAsync({ profilePhotoUrl: url });
        }}
      />
      <ImageUploadField
        label={t('onboarding.kitchenPhoto')}
        previewUri={profile.data.kitchenPhotoUrl}
        hasValue={Boolean(profile.data.kitchenPhotoUrl)}
        upload={async (uri) => {
          const { url } = await uploadPublicImage(`sellers/${uid}/kitchen`, uri);
          await update.mutateAsync({ kitchenPhotoUrl: url });
        }}
      />
      <StorefrontForm seller={profile.data} onSaved={() => router.back()} />
    </Screen>
  );
}
