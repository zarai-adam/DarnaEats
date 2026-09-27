import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, HelperText, List, Text } from 'react-native-paper';
import { Avatar, DirectionalIcon, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUnreadNotificationCount } from '@/features/notifications/api';
import { useBecomeSeller } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { useSettingsStore } from '@/store/settingsStore';
import { errorMessage } from '@/utils/errors';
import { palette, spacing } from '@/theme';

export default function BuyerProfile() {
  const { t } = useLocalized();
  const { user, profile, isSeller, isStaff, refresh, signOut } = useAuth();
  const setMode = useSettingsStore((s) => s.setMode);
  const unread = useUnreadNotificationCount(user?.uid ?? '');
  const becomeSeller = useBecomeSeller();
  const [error, setError] = useState<string | null>(null);
  const chevron = () => <DirectionalIcon name="chevron-right" size={24} color={palette.muted} />;

  const goSell = async () => {
    setError(null);
    try {
      if (!isSeller) {
        await becomeSeller.mutateAsync();
        await refresh();
        track('seller_application_started');
      }
      setMode('seller');
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Avatar uri={profile?.photoUrl} name={profile?.displayName || '?'} size={64} />
        <View style={styles.flex}>
          <Text variant="titleLarge">{profile?.displayName || t('profile.guest')}</Text>
          <Text variant="bodySmall" style={styles.muted}>
            {user?.email ?? user?.phoneNumber ?? ''}
          </Text>
        </View>
      </View>
      <List.Section>
        <List.Item
          title={t('favorites.title')}
          left={(p) => <List.Icon {...p} icon="heart-outline" />}
          right={chevron}
          onPress={() => router.push('/favorites')}
          style={styles.item}
        />
        <List.Item
          title={t('notifications.title')}
          left={(p) => <List.Icon {...p} icon="bell-outline" />}
          right={() => (unread.data ? <Badge style={styles.badge}>{unread.data}</Badge> : chevron())}
          onPress={() => router.push('/notifications')}
          style={styles.item}
        />
        <List.Item
          title={t('cart.title')}
          left={(p) => <List.Icon {...p} icon="cart-outline" />}
          right={chevron}
          onPress={() => router.push('/cart')}
          style={styles.item}
        />
        <List.Item
          title={t('settings.title')}
          left={(p) => <List.Icon {...p} icon="cog-outline" />}
          right={chevron}
          onPress={() => router.push('/settings')}
          style={styles.item}
        />
        <List.Item
          title={t('report.problem')}
          left={(p) => <List.Icon {...p} icon="flag-outline" />}
          right={chevron}
          onPress={() => router.push({ pathname: '/report', params: { targetType: 'other', targetId: 'app' } })}
          style={styles.item}
        />
      </List.Section>
      <List.Section>
        <List.Item
          title={isSeller ? t('profile.switchToSeller') : t('profile.sellFood')}
          description={isSeller ? undefined : t('profile.sellFoodDescription')}
          left={(p) => <List.Icon {...p} icon="chef-hat" color={palette.olive} />}
          right={chevron}
          onPress={() => void goSell()}
          disabled={becomeSeller.isPending}
          style={styles.item}
        />
        {isStaff ? (
          <List.Item
            title={t('admin.title')}
            left={(p) => <List.Icon {...p} icon="shield-account-outline" />}
            right={chevron}
            onPress={() => router.push('/admin')}
            style={styles.item}
          />
        ) : null}
        <List.Item
          title={t('auth.signOut')}
          left={(p) => <List.Icon {...p} icon="logout" color={palette.danger} />}
          onPress={() => void signOut().then(() => router.replace('/'))}
          style={styles.item}
        />
      </List.Section>
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  item: { backgroundColor: palette.white, borderRadius: 12, marginBottom: spacing.xs, minHeight: 56 },
  badge: { alignSelf: 'center' },
  muted: { color: palette.muted },
});
