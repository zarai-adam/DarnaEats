import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from 'react-native-paper';
import { EmptyState, LoadingState, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { palette } from '@/theme';

/**
 * Admin route tree. Access is decided by the `roles` custom claim, which only
 * Cloud Functions can set; every privileged action is re-checked server-side.
 */
export default function AdminLayout() {
  const { t } = useTranslation();
  const { initializing, user, isStaff } = useAuth();
  if (initializing) return <LoadingState />;
  if (!user || !isStaff) {
    return (
      <Screen>
        <EmptyState
          icon="shield-lock-outline"
          title={t('admin.accessDenied')}
          message={t('admin.accessDeniedMessage')}
          action={
            <Button mode="contained" onPress={() => router.replace(user ? '/' : '/sign-in')}>
              {user ? t('common.backHome') : t('auth.signIn')}
            </Button>
          }
        />
      </Screen>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.deepBlue },
        headerTintColor: palette.white,
        contentStyle: { backgroundColor: palette.cream },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('admin.title') }} />
      <Stack.Screen name="verification/index" options={{ title: t('admin.verification') }} />
      <Stack.Screen name="verification/[id]" options={{ title: t('admin.application') }} />
      <Stack.Screen name="reports/index" options={{ title: t('admin.reports') }} />
      <Stack.Screen name="reports/[id]" options={{ title: t('admin.report') }} />
      <Stack.Screen name="reviews" options={{ title: t('admin.reviews') }} />
      <Stack.Screen name="dishes" options={{ title: t('admin.dishes') }} />
      <Stack.Screen name="sellers/index" options={{ title: t('admin.sellers') }} />
      <Stack.Screen name="sellers/[id]" options={{ title: t('admin.seller') }} />
      <Stack.Screen name="users" options={{ title: t('admin.users') }} />
      <Stack.Screen name="analytics" options={{ title: t('admin.analytics') }} />
      <Stack.Screen name="audit" options={{ title: t('admin.audit') }} />
      <Stack.Screen name="categories" options={{ title: t('admin.categories') }} />
      <Stack.Screen name="locations" options={{ title: t('admin.locations') }} />
      <Stack.Screen name="settings" options={{ title: t('admin.settings') }} />
      <Stack.Screen name="conversation" options={{ title: t('admin.conversation') }} />
    </Stack>
  );
}
