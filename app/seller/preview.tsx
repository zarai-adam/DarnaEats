import { Text } from 'react-native-paper';
import { ErrorState, LoadingState, Screen, StorefrontView } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMySellerProfile } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { palette } from '@/theme';

export default function StorefrontPreview() {
  const { t } = useLocalized();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  if (profile.isLoading) return <LoadingState />;
  if (!profile.data) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  return (
    <Screen scroll>
      <Text variant="bodySmall" style={{ color: palette.muted }}>
        {t('sellerProfile.previewNote')}
      </Text>
      <StorefrontView seller={profile.data} preview />
    </Screen>
  );
}
