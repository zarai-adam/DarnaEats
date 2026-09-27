import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, HelperText, Text } from 'react-native-paper';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMyVerification, useUpdateVerification } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { palette, spacing } from '@/theme';

const HYGIENE_RULES = [
  'hygiene.rule1',
  'hygiene.rule2',
  'hygiene.rule3',
  'hygiene.rule4',
  'hygiene.rule5',
  'hygiene.rule6',
] as const;
const SAFETY_RULES = ['foodSafety.rule1', 'foodSafety.rule2', 'foodSafety.rule3', 'foodSafety.rule4'] as const;

export default function OnboardingAgreements() {
  const { t } = useLocalized();
  const uid = useUid();
  const verification = useMyVerification(uid);
  const update = useUpdateVerification(uid);
  const [hygiene, setHygiene] = useState<boolean | null>(null);
  const [safety, setSafety] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (verification.isLoading) return <LoadingState />;
  if (!verification.data) return <ErrorState error={verification.error} onRetry={() => void verification.refetch()} />;
  const hygieneOn = hygiene ?? verification.data.hygieneAgreementAccepted;
  const safetyOn = safety ?? verification.data.foodSafetyAgreementAccepted;

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({ hygieneAgreementAccepted: hygieneOn, foodSafetyAgreementAccepted: safetyOn });
      router.back();
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };

  return (
    <Screen scroll>
      <Text variant="bodySmall" style={styles.muted}>
        {t('onboarding.agreementsDisclaimer')}
      </Text>
      <SectionHeader title={t('hygiene.title')} />
      {HYGIENE_RULES.map((key) => (
        <Text key={key} variant="bodyMedium">
          • {t(key)}
        </Text>
      ))}
      <View style={styles.check}>
        <Checkbox.Android
          status={hygieneOn ? 'checked' : 'unchecked'}
          onPress={() => setHygiene(!hygieneOn)}
          accessibilityLabel={t('hygiene.accept')}
        />
        <Text variant="bodyMedium" style={styles.flex} onPress={() => setHygiene(!hygieneOn)}>
          {t('hygiene.accept')}
        </Text>
      </View>
      <SectionHeader title={t('foodSafety.title')} />
      {SAFETY_RULES.map((key) => (
        <Text key={key} variant="bodyMedium">
          • {t(key)}
        </Text>
      ))}
      <View style={styles.check}>
        <Checkbox.Android
          status={safetyOn ? 'checked' : 'unchecked'}
          onPress={() => setSafety(!safetyOn)}
          accessibilityLabel={t('foodSafety.accept')}
        />
        <Text variant="bodyMedium" style={styles.flex} onPress={() => setSafety(!safetyOn)}>
          {t('foodSafety.accept')}
        </Text>
      </View>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained"
        disabled={!hygieneOn || !safetyOn || update.isPending}
        loading={update.isPending}
        onPress={save}
        contentStyle={{ minHeight: 48 }}
      >
        {t('common.saveAndContinue')}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.xs,
  },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
