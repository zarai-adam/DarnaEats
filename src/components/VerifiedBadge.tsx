import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { palette } from '@/theme';

export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.badge} accessibilityRole="text" accessibilityLabel={t('trust.verifiedKitchen')}>
      <MaterialCommunityIcons name="check-decagram" size={compact ? 14 : 18} color={palette.white} />
      {compact ? null : <Text style={styles.text}>{t('trust.verifiedKitchen')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.olive,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { color: palette.white, fontSize: 12, fontWeight: '600' },
});
