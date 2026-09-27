import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, HelperText, Text } from 'react-native-paper';
import { FormField, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { signUpSchema, type SignUpValues } from '@/schemas/auth';
import { auth } from '@/services/firebase/app';
import { api } from '@/services/firebase/callables';
import { useSettingsStore } from '@/store/settingsStore';
import { errorMessage } from '@/utils/errors';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const language = useSettingsStore((s) => s.language) ?? 'ar';
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email.trim(), values.password);
      await updateProfile(credential.user, { displayName: values.displayName.trim() });
      await api.ensureUserProfile({ displayName: values.displayName.trim(), preferredLanguage: language });
      await refresh();
      router.replace('/terms');
    } catch (e) {
      setError(errorMessage(e, t));
    }
  });

  return (
    <Screen scroll>
      <Text variant="bodyMedium">{t('auth.signUpIntro')}</Text>
      <FormField
        control={control}
        name="displayName"
        label={t('auth.displayName')}
        autoComplete="name"
        textContentType="name"
      />
      <FormField
        control={control}
        name="email"
        label={t('auth.email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        control={control}
        name="password"
        label={t('auth.password')}
        secureTextEntry
        autoComplete="new-password"
        helper={t('auth.passwordHelp')}
      />
      <FormField
        control={control}
        name="confirmPassword"
        label={t('auth.confirmPassword')}
        secureTextEntry
        autoComplete="new-password"
      />
      {error ? (
        <HelperText type="error" accessibilityLiveRegion="assertive">
          {error}
        </HelperText>
      ) : null}
      <Button
        mode="contained"
        onPress={onSubmit}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={{ minHeight: 48 }}
      >
        {t('auth.createAccount')}
      </Button>
      <Button onPress={() => router.replace('/sign-in')}>{t('auth.haveAccount')}</Button>
    </Screen>
  );
}
