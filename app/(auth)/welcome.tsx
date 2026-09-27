import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing } from '@/theme';

const POINTS = [
  { icon: 'home-heart', key: 'welcome.pointHomemade' },
  { icon: 'check-decagram', key: 'welcome.pointVerified' },
  { icon: 'map-marker-radius', key: 'welcome.pointLocal' },
  { icon: 'cash', key: 'welcome.pointCash' },
] as const;

export default function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="displaySmall" style={styles.title} accessibilityRole="header">
          {t('app.name')}
        </Text>
        <Text variant="titleMedium" style={styles.subtitle}>
          {t('welcome.subtitle')}
        </Text>
        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.key} style={styles.point}>
              <MaterialCommunityIcons
                name={p.icon}
                size={28}
                color={palette.olive}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text variant="bodyLarge" style={styles.pointText}>
                {t(p.key)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Button mode="contained" icon="phone" onPress={() => router.push('/phone')} contentStyle={styles.button}>
          {t('auth.continueWithPhone')}
        </Button>
        <Button
          mode="outlined"
          icon="email-outline"
          onPress={() => router.push('/sign-in')}
          contentStyle={styles.button}
        >
          {t('auth.continueWithEmail')}
        </Button>
        <Button mode="text" onPress={() => router.push('/sign-up')} contentStyle={styles.button}>
          {t('auth.createAccount')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { color: palette.terracotta },
  subtitle: { color: palette.text },
  points: { gap: spacing.lg, marginTop: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointText: { flex: 1 },
  actions: { padding: spacing.xl, gap: spacing.sm },
  button: { minHeight: 50 },
});
