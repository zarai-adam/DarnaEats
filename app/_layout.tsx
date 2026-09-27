import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useCartSync } from '@/features/cart/useCartSync';
import { setupOnlineManager } from '@/hooks/useNetwork';
import i18n, { detectDeviceLanguage, initI18n, syncLayoutDirection } from '@/localization/i18n';
import { reloadApp } from '@/localization/reload';
import { track } from '@/services/analytics';
import { routeForNotification } from '@/services/notifications';
import { useSettingsStore } from '@/store/settingsStore';
import { buildTheme, palette } from '@/theme';

void SplashScreen.preventAutoHideAsync();
setupOnlineManager();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online', retry: 0 },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'darna-query-cache', throttleTime: 2000 });

function RootNavigator() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useCartSync(user?.uid);

  useEffect(() => {
    track('app_open');
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const route = routeForNotification(data, useSettingsStore.getState().mode === 'seller');
      if (route) router.push(route as never);
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.cream },
        headerTintColor: palette.text,
        headerTitleStyle: { fontFamily: i18n.language === 'ar' ? 'NotoSansArabic_700Bold' : 'Inter_700Bold' },
        contentStyle: { backgroundColor: palette.cream },
        headerBackTitle: t('common.back'),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
      <Stack.Screen name="seller" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ title: t('chat.title') }} />
      <Stack.Screen name="notifications" options={{ title: t('notifications.title') }} />
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      <Stack.Screen name="report" options={{ title: t('report.title'), presentation: 'modal' }} />
      <Stack.Screen name="legal" options={{ title: t('legal.title') }} />
    </Stack>
  );
}

export default function RootLayout() {
  const hydrated = useSettingsStore((s) => s.hasHydrated);
  const language = useSettingsStore((s) => s.language);
  const [fontsLoaded, fontError] = useFonts({
    NotoSansArabic_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const effectiveLanguage = language ?? detectDeviceLanguage();

  // i18n must be initialised before the first localized render, so it runs
  // synchronously here (idempotent) rather than in an effect.
  const ready = useMemo(() => {
    if (!hydrated) return false;
    initI18n(effectiveLanguage);
    return !syncLayoutDirection(effectiveLanguage);
  }, [hydrated, effectiveLanguage]);

  useEffect(() => {
    // Native RTL/LTR switching requires one reload after the direction changes.
    if (hydrated && !ready) void reloadApp();
  }, [hydrated, ready]);

  const theme = useMemo(() => buildTheme(effectiveLanguage), [effectiveLanguage]);
  const appReady = ready && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (appReady) void SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: 24 * 60 * 60_000,
            buster: 'v1',
            // Only explicitly opted-in, non-sensitive queries are cached on disk.
            dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' && q.meta?.persist === true },
          }}
        >
          <I18nextProvider i18n={i18n}>
            <PaperProvider theme={theme}>
              <AuthProvider>
                <StatusBar style="dark" />
                <RootNavigator />
              </AuthProvider>
            </PaperProvider>
          </I18nextProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
