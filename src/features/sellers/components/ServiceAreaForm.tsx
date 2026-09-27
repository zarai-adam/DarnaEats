import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Switch, Text } from 'react-native-paper';
import { FormField, SelectField } from '@/components';
import { useCities, useGovernorates, useServiceAreas } from '@/features/catalog/api';
import { useLocalized } from '@/localization/useLocalized';
import { serviceAreaSchema, type ServiceAreaValues } from '@/schemas/seller';
import type { SellerPrivate, SellerProfile } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { palette, spacing } from '@/theme';
import { useUpdateSellerPrivate, useUpdateSellerProfile } from '../api';

/**
 * Service area & fulfillment settings. The public profile only receives the
 * service area's approximate centre; the exact pickup address is stored in
 * the private `sellerPrivate` document and shared only on accepted orders.
 */
export function ServiceAreaForm({
  seller,
  privateData,
  onSaved,
  submitLabel,
}: {
  seller: SellerProfile;
  privateData: SellerPrivate | null;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const { t, pick } = useLocalized();
  const governorates = useGovernorates();
  const cities = useCities();
  const areas = useServiceAreas();
  const updateProfile = useUpdateSellerProfile(seller.id);
  const updatePrivate = useUpdateSellerPrivate(seller.id);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, setValue, formState } = useForm<ServiceAreaValues>({
    resolver: zodResolver(serviceAreaSchema),
    defaultValues: {
      governorateId: seller.governorateId ?? '',
      cityId: seller.cityId ?? '',
      serviceAreaId: seller.serviceAreaId ?? '',
      pickupAvailable: seller.pickupAvailable,
      selfDeliveryAvailable: seller.selfDeliveryAvailable,
      deliveryFee: seller.deliveryFee ?? 0,
      pickupAddress: privateData?.pickupAddress ?? '',
    },
  });
  const governorateId = useWatch({ control, name: 'governorateId' });
  const cityId = useWatch({ control, name: 'cityId' });
  const delivery = useWatch({ control, name: 'selfDeliveryAvailable' });
  const pickup = useWatch({ control, name: 'pickupAvailable' });

  const save = handleSubmit(async (values) => {
    setError(null);
    const area = areas.data?.find((a) => a.id === values.serviceAreaId);
    if (!area) {
      setError(t('validation.required'));
      return;
    }
    try {
      await updateProfile.mutateAsync({
        governorateId: values.governorateId,
        cityId: values.cityId,
        serviceAreaId: area.id,
        serviceAreas: [area.id],
        approximateLatitude: area.approximateLatitude,
        approximateLongitude: area.approximateLongitude,
        pickupAvailable: values.pickupAvailable,
        selfDeliveryAvailable: values.selfDeliveryAvailable,
        deliveryFee: values.selfDeliveryAvailable ? values.deliveryFee : 0,
      });
      await updatePrivate.mutateAsync({ pickupAddress: values.pickupAddress.trim() });
      onSaved?.();
    } catch (e) {
      setError(errorMessage(e, t));
    }
  });

  return (
    <>
      <Controller
        control={control}
        name="governorateId"
        render={({ field, fieldState }) => (
          <SelectField
            label={t('location.governorate')}
            value={field.value}
            options={(governorates.data ?? []).map((g) => ({ value: g.id, label: pick(g, 'name') }))}
            onChange={(v) => {
              field.onChange(v);
              setValue('cityId', '');
              setValue('serviceAreaId', '');
            }}
            error={fieldState.error ? t(fieldState.error.message ?? '') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="cityId"
        render={({ field, fieldState }) => (
          <SelectField
            label={t('location.city')}
            value={field.value}
            disabled={!governorateId}
            options={(cities.data ?? [])
              .filter((c) => c.governorateId === governorateId)
              .map((c) => ({ value: c.id, label: pick(c, 'name') }))}
            onChange={(v) => {
              field.onChange(v);
              setValue('serviceAreaId', '');
            }}
            error={fieldState.error ? t(fieldState.error.message ?? '') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="serviceAreaId"
        render={({ field, fieldState }) => (
          <SelectField
            label={t('location.area')}
            value={field.value}
            disabled={!cityId}
            options={(areas.data ?? [])
              .filter((a) => a.cityId === cityId)
              .map((a) => ({ value: a.id, label: pick(a, 'name') }))}
            onChange={field.onChange}
            error={fieldState.error ? t(fieldState.error.message ?? '') : undefined}
          />
        )}
      />
      <Text variant="bodySmall" style={styles.muted}>
        {t('sellerForm.areaPrivacy')}
      </Text>

      <View style={styles.switchRow}>
        <Text variant="bodyLarge" style={styles.flex}>
          {t('fulfillment.pickup')}
        </Text>
        <Controller
          control={control}
          name="pickupAvailable"
          render={({ field }) => (
            <Switch value={field.value} onValueChange={field.onChange} accessibilityLabel={t('fulfillment.pickup')} />
          )}
        />
      </View>
      {pickup ? (
        <>
          <FormField
            control={control}
            name="pickupAddress"
            label={t('sellerForm.pickupAddress')}
            multiline
            maxLength={300}
          />
          <Text variant="bodySmall" style={styles.muted}>
            {t('sellerForm.pickupAddressPrivacy')}
          </Text>
        </>
      ) : null}
      <View style={styles.switchRow}>
        <Text variant="bodyLarge" style={styles.flex}>
          {t('fulfillment.sellerDelivery')}
        </Text>
        <Controller
          control={control}
          name="selfDeliveryAvailable"
          render={({ field }) => (
            <Switch
              value={field.value}
              onValueChange={field.onChange}
              accessibilityLabel={t('fulfillment.sellerDelivery')}
            />
          )}
        />
      </View>
      {delivery ? <FormField control={control} name="deliveryFee" label={t('sellerForm.deliveryFee')} numeric /> : null}
      {formState.errors.pickupAvailable ? (
        <HelperText type="error">{t(formState.errors.pickupAvailable.message ?? '')}</HelperText>
      ) : null}
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

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
