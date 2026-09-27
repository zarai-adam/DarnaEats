import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, HelperText, Text } from 'react-native-paper';
import { REPORT_REASONS, REPORT_TARGET_TYPES, type ReportReason, type ReportTargetType } from '@shared/constants';
import { ChipSelector, FormField, Screen } from '@/components';
import { useCreateReport } from '@/features/reports/api';
import { useLocalized } from '@/localization/useLocalized';
import { reportSchema, type ReportValues } from '@/schemas/checkout';
import { errorMessage } from '@/utils/errors';

/** Generic report flow for sellers, buyers, dishes, reviews, orders, chats. */
export default function ReportScreen() {
  const { t } = useLocalized();
  const params = useLocalSearchParams<{ targetType?: string; targetId?: string }>();
  const targetType = (REPORT_TARGET_TYPES as readonly string[]).includes(params.targetType ?? '')
    ? (params.targetType as ReportTargetType)
    : 'other';
  const targetId = params.targetId ?? 'app';
  const create = useCreateReport();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { control, handleSubmit, formState } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: '', description: '' },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await create.mutateAsync({
        targetType,
        targetId,
        reason: values.reason as ReportReason,
        ...(values.description ? { description: values.description } : {}),
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e, t));
    }
  });

  if (done) {
    return (
      <Screen>
        <Text variant="titleLarge" accessibilityRole="header">
          {t('report.thanksTitle')}
        </Text>
        <Text variant="bodyMedium">{t('report.thanksMessage')}</Text>
        <Button mode="contained" onPress={() => router.back()}>
          {t('common.close')}
        </Button>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="bodyMedium">{t('report.intro', { target: t(`report.target.${targetType}`) })}</Text>
      <Controller
        control={control}
        name="reason"
        render={({ field, fieldState }) => (
          <ChipSelector
            label={t('report.reason')}
            multiple={false}
            options={REPORT_REASONS.map((r) => ({ value: r, label: t(`report.reasons.${r}`) }))}
            selected={field.value ? [field.value as ReportReason] : []}
            onChange={([v]) => field.onChange(v ?? '')}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <FormField
        control={control}
        name="description"
        label={t('report.description')}
        multiline
        numberOfLines={5}
        maxLength={2000}
      />
      <Text variant="bodySmall">{t('report.urgentNotice')}</Text>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained"
        onPress={submit}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={{ minHeight: 48 }}
      >
        {t('report.submit')}
      </Button>
    </Screen>
  );
}
