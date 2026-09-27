import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBecomeSeller } from '@/features/sellers/api';
import { track } from '@/services/analytics';
import { useSettingsStore } from '@/store/settingsStore';
import { errorMessage } from '@/utils/errors';
import { palette, radius, spacing } from '@/theme';

export default function RoleScreen() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const setMode = useSettingsStore((s) => s.setMode);
  const becomeSeller = useBecomeSeller();
  const [error, setError] = useState<string | null>(null);

  const chooseBuyer = () => {
    setMode('buyer');
    router.replace('/home');
  };

  const chooseSeller = async () => {
    setError(null);
    try {
      await becomeSeller.mutateAsync();
      await refresh();
      track('seller_application_started');
      setMode('seller');
      router.replace('/seller/onboarding');
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };

  return (
    <Screen scroll>
      <Text variant="titleLarge" accessibilityRole="header">
        {t('auth.roleQuestion')}
      </Text>
      <Pressable
        style={styles.card}
        onPress={chooseBuyer}
        accessibilityRole="button"
        accessibilityLabel={t('auth.roleBuyer')}
      >
        <MaterialCommunityIcons name="food-fork-drink" size={36} color={palette.terracotta} />
        <View style={styles.flex}>
          <Text variant="titleMedium">{t('auth.roleBuyer')}</Text>
          <Text variant="bodyMedium" style={styles.muted}>
            {t('auth.roleBuyerDescription')}
          </Text>
        </View>
      </Pressable>
      <Pressable
        style={styles.card}
        onPress={() => void chooseSeller()}
        disabled={becomeSeller.isPending}
        accessibilityRole="button"
        accessibilityLabel={t('auth.roleSeller')}
        accessibilityState={{ busy: becomeSeller.isPending }}
      >
        <MaterialCommunityIcons name="chef-hat" size={36} color={palette.olive} />
        <View style={styles.flex}>
          <Text variant="titleMedium">{t('auth.roleSeller')}</Text>
          <Text variant="bodyMedium" style={styles.muted}>
            {t('auth.roleSellerDescription')}
          </Text>
        </View>
      </Pressable>
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    minHeight: 88,
  },
  flex: { flex: 1, gap: 4 },
  muted: { color: palette.muted },
});
