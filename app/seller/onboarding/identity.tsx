import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, HelperText, Text } from 'react-native-paper';
import { IDENTITY_DOCUMENT_TYPES } from '@shared/constants';
import { ChipSelector, ErrorState, FormField, ImageUploadField, LoadingState, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMyVerification, useUpdateVerification } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { identitySchema, type IdentityValues } from '@/schemas/seller';
import { uploadImage } from '@/services/firebase/storage';
import { errorMessage } from '@/utils/errors';

/**
 * Identity step. The document image goes to the private
 * `verification/{uid}/` storage path, readable only by the seller and staff.
 */
export default function OnboardingIdentity() {
  const { t } = useLocalized();
  const uid = useUid();
  const verification = useMyVerification(uid);
  const update = useUpdateVerification(uid);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    values: verification.data
      ? {
          legalFullName: verification.data.legalFullName ?? '',
          identityDocumentType: verification.data.identityDocumentType ?? ('' as never),
        }
      : undefined,
  });

  if (verification.isLoading) return <LoadingState />;
  if (!verification.data) return <ErrorState error={verification.error} onRetry={() => void verification.refetch()} />;
  const v = verification.data;

  const save = handleSubmit(async (values) => {
    setError(null);
    if (!v.identityDocumentPath) {
      setError(t('onboarding.documentRequired'));
      return;
    }
    try {
      await update.mutateAsync({
        legalFullName: values.legalFullName.trim(),
        identityDocumentType: values.identityDocumentType,
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e, t));
    }
  });

  return (
    <Screen scroll>
      <Text variant="bodyMedium">{t('onboarding.identityIntro')}</Text>
      <FormField
        control={control}
        name="legalFullName"
        label={t('onboarding.legalName')}
        autoComplete="name"
        maxLength={120}
      />
      <Controller
        control={control}
        name="identityDocumentType"
        render={({ field, fieldState }) => (
          <ChipSelector
            label={t('onboarding.documentType')}
            multiple={false}
            options={IDENTITY_DOCUMENT_TYPES.map((d) => ({ value: d, label: t(`documentType.${d}`) }))}
            selected={field.value ? [field.value] : []}
            onChange={([val]) => field.onChange(val)}
            error={fieldState.error ? t('validation.required') : undefined}
          />
        )}
      />
      <ImageUploadField
        label={t('onboarding.documentPhoto')}
        description={t('onboarding.documentPhotoHelp')}
        hasValue={Boolean(v.identityDocumentPath)}
        privateNotice={t('onboarding.documentPrivacy')}
        upload={async (localUri) => {
          const path = await uploadImage(`verification/${uid}`, localUri, { maxDimension: 2000 });
          await update.mutateAsync({ identityDocumentPath: path });
        }}
      />
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained"
        onPress={save}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={{ minHeight: 48 }}
      >
        {t('common.saveAndContinue')}
      </Button>
    </Screen>
  );
}
