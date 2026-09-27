import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState, tabIcon } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMySellerProfile } from '@/features/sellers/api';
import { palette } from '@/theme';

/** Seller tools are only reachable once an admin has approved the seller. */
export default function SellerTabs() {
  const { t } = useTranslation();
  const uid = useUid();
  const profile = useMySellerProfile(uid);
  if (profile.isLoading) return <LoadingState />;
  if (profile.error && !profile.data)
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  if (profile.data?.status !== 'approved') return <Redirect href="/seller/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.olive,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: { backgroundColor: palette.white, minHeight: 60 },
        headerStyle: { backgroundColor: palette.cream },
        headerTintColor: palette.text,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: t('sellerTabs.dashboard'), tabBarIcon: tabIcon('view-dashboard-outline') }}
      />
      <Tabs.Screen
        name="menu"
        options={{ title: t('sellerTabs.menu'), tabBarIcon: tabIcon('silverware-fork-knife') }}
      />
      <Tabs.Screen name="orders" options={{ title: t('sellerTabs.orders'), tabBarIcon: tabIcon('receipt') }} />
      <Tabs.Screen name="messages" options={{ title: t('sellerTabs.messages'), tabBarIcon: tabIcon('chat-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('sellerTabs.profile'), tabBarIcon: tabIcon('store-outline') }} />
    </Tabs>
  );
}
