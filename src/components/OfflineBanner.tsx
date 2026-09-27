import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useIsOnline } from '@/hooks/useNetwork';
import { palette } from '@/theme';

export function OfflineBanner() {
  const online = useIsOnline();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>{t('common.offlineBanner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: palette.deepBlue, paddingVertical: 6, paddingHorizontal: 12 },
  text: { color: palette.white, textAlign: 'center', fontSize: 13 },
});
