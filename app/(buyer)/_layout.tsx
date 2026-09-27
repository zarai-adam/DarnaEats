import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { palette } from '@/theme';

export default function BuyerLayout() {
  const { t } = useTranslation();
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingState />;
  if (!user) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.cream },
        contentStyle: { backgroundColor: palette.cream },
        headerTintColor: palette.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="daily-menu" options={{ title: t('dailyMenu.title') }} />
      <Stack.Screen name="search" options={{ title: t('search.title') }} />
      <Stack.Screen name="category/[id]" options={{ title: t('categories.title') }} />
      <Stack.Screen name="map" options={{ title: t('map.title') }} />
      <Stack.Screen name="kitchen/[id]/index" options={{ title: t('seller.storefront') }} />
      <Stack.Screen name="kitchen/[id]/reviews" options={{ title: t('reviews.title') }} />
      <Stack.Screen name="dish/[id]" options={{ title: '' }} />
      <Stack.Screen name="favorites" options={{ title: t('favorites.title') }} />
      <Stack.Screen name="cart" options={{ title: t('cart.title') }} />
      <Stack.Screen name="checkout" options={{ title: t('checkout.title') }} />
      <Stack.Screen
        name="order-confirmation/[id]"
        options={{ title: t('checkout.confirmedTitle'), headerBackVisible: false, gestureEnabled: false }}
      />
      <Stack.Screen name="order/[id]" options={{ title: t('orders.detailTitle') }} />
      <Stack.Screen name="review/[orderId]" options={{ title: t('reviews.writeTitle'), presentation: 'modal' }} />
    </Stack>
  );
}
