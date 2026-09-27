import { router, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { List } from 'react-native-paper';
import { DirectionalIcon, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLocalized } from '@/localization/useLocalized';
import { useSettingsStore } from '@/store/settingsStore';
import { palette, spacing } from '@/theme';

export default function SellerProfileTab() {
  const { t } = useLocalized();
  const { signOut } = useAuth();
  const setMode = useSettingsStore((s) => s.setMode);
  const chevron = () => <DirectionalIcon name="chevron-right" size={24} color={palette.muted} />;
  const items: { icon: string; label: string; route: Href }[] = [
    { icon: 'storefront-edit-outline', label: t('sellerProfile.storefront'), route: '/seller/storefront' },
    { icon: 'eye-outline', label: t('sellerProfile.preview'), route: '/seller/preview' },
    { icon: 'map-marker-radius-outline', label: t('sellerProfile.availability'), route: '/seller/availability' },
    { icon: 'calendar-today', label: t('sellerMenu.dailyMenus'), route: '/seller/menus' },
    { icon: 'star-outline', label: t('reviews.received'), route: '/seller/reviews' },
    { icon: 'cash-multiple', label: t('earnings.title'), route: '/seller/earnings' },
    { icon: 'bell-outline', label: t('notifications.title'), route: '/notifications' },
    { icon: 'cog-outline', label: t('settings.title'), route: '/settings' },
  ];
  return (
    <Screen scroll>
      <List.Section>
        {items.map((item) => (
          <List.Item
            key={item.label}
            title={item.label}
            left={(p) => <List.Icon {...p} icon={item.icon} />}
            right={chevron}
            onPress={() => router.push(item.route)}
            style={styles.item}
          />
        ))}
      </List.Section>
      <List.Item
        title={t('profile.switchToBuyer')}
        left={(p) => <List.Icon {...p} icon="food-fork-drink" color={palette.terracotta} />}
        onPress={() => {
          setMode('buyer');
          router.replace('/');
        }}
        style={styles.item}
      />
      <List.Item
        title={t('auth.signOut')}
        left={(p) => <List.Icon {...p} icon="logout" color={palette.danger} />}
        onPress={() => void signOut().then(() => router.replace('/'))}
        style={styles.item}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { backgroundColor: palette.white, borderRadius: 12, marginBottom: spacing.xs, minHeight: 56 },
});
