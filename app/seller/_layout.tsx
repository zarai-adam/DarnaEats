import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { palette } from '@/theme';

/** Seller area: requires the seller role (granted by the becomeSeller function). */
export default function SellerLayout() {
  const { t } = useTranslation();
  const { user, isSeller, initializing } = useAuth();
  if (initializing) return <LoadingState />;
  if (!user || !isSeller) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.cream },
        contentStyle: { backgroundColor: palette.cream },
        headerTintColor: palette.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/index" options={{ title: t('onboarding.title'), headerBackVisible: false }} />
      <Stack.Screen name="onboarding/profile" options={{ title: t('onboarding.stepProfile') }} />
      <Stack.Screen name="onboarding/identity" options={{ title: t('onboarding.stepIdentity') }} />
      <Stack.Screen name="onboarding/kitchen" options={{ title: t('onboarding.stepKitchen') }} />
      <Stack.Screen name="onboarding/agreements" options={{ title: t('onboarding.stepAgreements') }} />
      <Stack.Screen name="onboarding/status" options={{ title: t('onboarding.statusTitle') }} />
      <Stack.Screen name="dish/new" options={{ title: t('dishForm.newTitle') }} />
      <Stack.Screen name="dish/[id]" options={{ title: t('dishForm.editTitle') }} />
      <Stack.Screen name="menus" options={{ title: t('sellerMenu.dailyMenus') }} />
      <Stack.Screen name="menu-editor" options={{ title: t('sellerMenu.editorTitle') }} />
      <Stack.Screen name="order/[id]" options={{ title: t('orders.detailTitle') }} />
      <Stack.Screen name="reviews" options={{ title: t('reviews.received') }} />
      <Stack.Screen name="earnings" options={{ title: t('earnings.title') }} />
      <Stack.Screen name="availability" options={{ title: t('sellerProfile.availability') }} />
      <Stack.Screen name="storefront" options={{ title: t('sellerProfile.storefront') }} />
      <Stack.Screen name="preview" options={{ title: t('sellerProfile.preview') }} />
    </Stack>
  );
}
