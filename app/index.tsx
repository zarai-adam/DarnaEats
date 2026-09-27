import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { ErrorState, LoadingState } from '@/components';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMySellerProfile } from '@/features/sellers/api';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme';

/**
 * Entry router: decides where a user lands based on language choice,
 * authentication, terms acceptance, role and seller status.
 */
export default function Index() {
  const { t } = useTranslation();
  const { initializing, user, profile, roles, isStaff, error, refresh, signOut } = useAuth();
  const language = useSettingsStore((s) => s.language);
  const mode = useSettingsStore((s) => s.mode);
  const wantsSeller = mode === 'seller' && roles.includes('seller');
  const seller = useMySellerProfile(user?.uid ?? '', wantsSeller);

  if (!language) return <Redirect href="/language" />;
  if (initializing) return <LoadingState />;
  if (!user) return <Redirect href="/welcome" />;
  if (error || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.cream }}>
        <ErrorState error={error} onRetry={() => void refresh()} />
        <Button onPress={() => void signOut()}>{t('auth.signOut')}</Button>
      </View>
    );
  }
  if (profile.acceptedTermsVersion !== env.termsVersion) return <Redirect href="/terms" />;
  if (!profile.isActive) return <ErrorState error={new Error('disabled')} />;
  if (isStaff) return <Redirect href="/admin" />;
  if (wantsSeller) {
    if (seller.isLoading) return <LoadingState />;
    if (seller.data?.status === 'approved') return <Redirect href="/seller/dashboard" />;
    return <Redirect href="/seller/onboarding" />;
  }
  return <Redirect href="/home" />;
}
