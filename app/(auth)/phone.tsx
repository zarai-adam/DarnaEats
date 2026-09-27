import { router, useLocalSearchParams } from 'expo-router';
import { linkWithPhoneNumber, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { PhoneVerifier, type PhoneVerifierHandle } from '@/features/auth/PhoneVerifier';
import { otpSchema, toE164Tunisia, tunisianPhoneSchema } from '@/schemas/auth';
import { auth } from '@/services/firebase/app';
import { errorMessage } from '@/utils/errors';

/**
 * Phone sign-in (primary flow in Tunisia) and phone linking (mode=link),
 * used by sellers to verify their number during onboarding.
 */
export default function PhoneScreen() {
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const linking = mode === 'link';
  const { refresh } = useAuth();
  const verifierRef = useRef<PhoneVerifierHandle>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    const parsed = tunisianPhoneSchema.safeParse(phone.replace(/\s/g, ''));
    if (!parsed.success) {
      setError(t('validation.phone'));
      return;
    }
    const verifier = verifierRef.current?.getVerifier();
    if (!verifier) return;
    setBusy(true);
    try {
      const e164 = toE164Tunisia(parsed.data);
      const result =
        linking && auth.currentUser
          ? await linkWithPhoneNumber(auth.currentUser, e164, verifier)
          : await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmation(result);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError(null);
    if (!confirmation || !otpSchema.safeParse(code).success) {
      setError(t('validation.otp'));
      return;
    }
    setBusy(true);
    try {
      await confirmation.confirm(code.trim());
      if (linking) {
        await refresh();
        router.back();
      } else {
        router.replace('/');
      }
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <PhoneVerifier ref={verifierRef} />
      <Text variant="bodyMedium">{linking ? t('auth.phoneLinkIntro') : t('auth.phoneIntro')}</Text>
      {!confirmation ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text variant="titleMedium" style={{ writingDirection: 'ltr' }}>
              +216
            </Text>
            <TextInput
              mode="outlined"
              style={{ flex: 1, backgroundColor: 'white', writingDirection: 'ltr', textAlign: 'left' }}
              label={t('auth.phoneNumber')}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^\d\s]/g, '').slice(0, 11))}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              accessibilityLabel={t('auth.phoneNumber')}
            />
          </View>
          <HelperText type="info">{t('auth.phoneHelp')}</HelperText>
          <Button mode="contained" onPress={sendCode} loading={busy} disabled={busy} contentStyle={{ minHeight: 48 }}>
            {t('auth.sendCode')}
          </Button>
        </>
      ) : (
        <>
          <Text variant="bodyMedium">{t('auth.codeSent', { phone: `+216 ${phone}` })}</Text>
          <TextInput
            mode="outlined"
            label={t('auth.verificationCode')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            style={{ backgroundColor: 'white', letterSpacing: 6, writingDirection: 'ltr', textAlign: 'center' }}
            accessibilityLabel={t('auth.verificationCode')}
          />
          <Button mode="contained" onPress={confirm} loading={busy} disabled={busy} contentStyle={{ minHeight: 48 }}>
            {t('auth.verify')}
          </Button>
          <Button
            onPress={() => {
              setConfirmation(null);
              setCode('');
            }}
          >
            {t('auth.changeNumber')}
          </Button>
        </>
      )}
      {error ? (
        <HelperText type="error" accessibilityLiveRegion="assertive">
          {error}
        </HelperText>
      ) : null}
    </Screen>
  );
}
