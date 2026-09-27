import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { palette } from '@/theme';

export default function AuthLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.cream },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: palette.cream },
      }}
    >
      <Stack.Screen name="language" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: t('auth.signIn') }} />
      <Stack.Screen name="sign-up" options={{ title: t('auth.signUp') }} />
      <Stack.Screen name="phone" options={{ title: t('auth.phoneTitle') }} />
      <Stack.Screen name="terms" options={{ title: t('auth.termsTitle'), headerBackVisible: false }} />
      <Stack.Screen name="role" options={{ title: t('auth.roleTitle'), headerBackVisible: false }} />
    </Stack>
  );
}
