import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, HelperText, Snackbar } from 'react-native-paper';
import { FormField, Screen } from '@/components';
import { signInSchema, type SignInValues } from '@/schemas/auth';
import { auth } from '@/services/firebase/app';
import { errorMessage } from '@/utils/errors';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { control, handleSubmit, getValues, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email.trim(), values.password);
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e, t));
    }
  });

  const resetPassword = async () => {
    const email = getValues('email').trim();
    if (!email) {
      setError(t('auth.enterEmailFirst'));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } finally {
      // Same message whether or not the account exists (no account enumeration).
      setNotice(t('auth.resetEmailSent'));
    }
  };

  return (
    <Screen scroll>
      <FormField
        control={control}
        name="email"
        label={t('auth.email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormField
        control={control}
        name="password"
        label={t('auth.password')}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
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
        {t('auth.signIn')}
      </Button>
      <Button onPress={resetPassword}>{t('auth.forgotPassword')}</Button>
      <Button onPress={() => router.replace('/sign-up')}>{t('auth.noAccount')}</Button>
      <Button icon="phone" onPress={() => router.replace('/phone')}>
        {t('auth.continueWithPhone')}
      </Button>
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={4000}>
        {notice}
      </Snackbar>
    </Screen>
  );
}
