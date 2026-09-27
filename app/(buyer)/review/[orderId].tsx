import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, HelperText, Text } from 'react-native-paper';
import { FormField, RatingStars, Screen } from '@/components';
import { useOrder } from '@/features/orders/api';
import { useSubmitReview } from '@/features/reviews/api';
import { useLocalized } from '@/localization/useLocalized';
import { reviewSchema, type ReviewValues } from '@/schemas/checkout';
import { track } from '@/services/analytics';
import { errorMessage } from '@/utils/errors';

export default function WriteReview() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { t } = useLocalized();
  const order = useOrder(orderId);
  const submit = useSubmitReview();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await submit.mutateAsync({
        orderId: orderId!,
        rating: values.rating,
        ...(values.comment ? { comment: values.comment } : {}),
      });
      track('review_submitted', { rating: values.rating });
      router.back();
    } catch (e) {
      setError(errorMessage(e, t));
    }
  });

  return (
    <Screen scroll>
      <Text variant="titleMedium">{t('reviews.howWas', { seller: order.data?.sellerName ?? '' })}</Text>
      <Controller
        control={control}
        name="rating"
        render={({ field, fieldState }) => (
          <>
            <RatingStars rating={field.value} onChange={field.onChange} />
            {fieldState.error ? (
              <HelperText type="error">{t(fieldState.error.message ?? 'validation.rating')}</HelperText>
            ) : null}
          </>
        )}
      />
      <FormField
        control={control}
        name="comment"
        label={t('reviews.comment')}
        multiline
        numberOfLines={4}
        maxLength={1000}
      />
      <Text variant="bodySmall">{t('reviews.publicNotice')}</Text>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained"
        onPress={onSubmit}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
        contentStyle={{ minHeight: 48 }}
      >
        {t('reviews.submit')}
      </Button>
    </Screen>
  );
}
