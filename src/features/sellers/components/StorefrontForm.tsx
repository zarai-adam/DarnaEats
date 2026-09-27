import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, HelperText } from 'react-native-paper';
import { SPECIALTIES } from '@shared/constants';
import { ChipSelector, FormField } from '@/components';
import { useLocalized } from '@/localization/useLocalized';
import { storefrontSchema, type StorefrontValues } from '@/schemas/seller';
import type { SellerProfile } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { useUpdateSellerProfile } from '../api';

export function StorefrontForm({
  seller,
  onSaved,
  submitLabel,
}: {
  seller: SellerProfile;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const { t } = useLocalized();
  const update = useUpdateSellerProfile(seller.id);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<StorefrontValues>({
    resolver: zodResolver(storefrontSchema),
    defaultValues: { displayName: seller.displayName, story: seller.story, specialties: seller.specialties },
  });

  const save = handleSubmit(async (values) => {
    setError(null);
    try {
      await update.mutateAsync({
        displayName: values.displayName.trim(),
        story: values.story.trim(),
        specialties: values.specialties,
      });
      onSaved?.();
    } catch (e) {
      setError(errorMessage(e, t));
    }
  });

  return (
    <>
      <FormField
        control={control}
        name="displayName"
        label={t('sellerForm.kitchenName')}
        helper={t('sellerForm.kitchenNameHelp')}
        maxLength={60}
      />
      <FormField
        control={control}
        name="story"
        label={t('sellerForm.story')}
        helper={t('sellerForm.storyHelp')}
        multiline
        numberOfLines={6}
        maxLength={1200}
      />
      <Controller
        control={control}
        name="specialties"
        render={({ field, fieldState }) => (
          <ChipSelector
            label={t('seller.specialties')}
            options={SPECIALTIES.map((s) => ({ value: s, label: t(`specialty.${s}`) }))}
            selected={field.value}
            onChange={field.onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained"
        onPress={save}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={{ minHeight: 48 }}
      >
        {submitLabel ?? t('common.save')}
      </Button>
    </>
  );
}
