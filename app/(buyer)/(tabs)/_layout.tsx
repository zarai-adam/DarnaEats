import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { tabIcon as icon } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useUnreadNotificationCount } from '@/features/notifications/api';
import { palette } from '@/theme';

export default function BuyerTabs() {
  const { t } = useTranslation();
  const uid = useUid();
  const unread = useUnreadNotificationCount(uid);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.terracotta,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: { backgroundColor: palette.white, minHeight: 60 },
        headerStyle: { backgroundColor: palette.cream },
        headerTintColor: palette.text,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t('tabs.home'), tabBarIcon: icon('home-variant-outline'), headerShown: false }}
      />
      <Tabs.Screen name="discover" options={{ title: t('tabs.discover'), tabBarIcon: icon('compass-outline') }} />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders'), tabBarIcon: icon('receipt') }} />
      <Tabs.Screen name="messages" options={{ title: t('tabs.messages'), tabBarIcon: icon('chat-outline') }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: icon('account-circle-outline'),
          tabBarBadge: unread.data ? unread.data : undefined,
        }}
      />
    </Tabs>
  );
}
