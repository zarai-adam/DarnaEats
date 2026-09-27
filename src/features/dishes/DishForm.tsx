import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Switch, Text } from 'react-native-paper';
import { ALLERGENS, DIETARY_TAGS, LIMITS, type Allergen, type DietaryTag } from '@shared/constants';
import { ChipSelector, DishImage, FormField, SectionHeader, SelectField } from '@/components';
import { useCategories } from '@/features/catalog/api';
import { pickImage } from '@/hooks/useImagePicker';
import { useLocalized } from '@/localization/useLocalized';
import { dishSchema, emptyDish, type DishFormValues } from '@/schemas/dish';
import { uploadPublicImage } from '@/services/firebase/storage';
import type { Dish } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { palette, radius, spacing } from '@/theme';
import { useSaveDish } from './api';

export function dishToForm(dish: Dish): DishFormValues {
  return {
    nameAr: dish.nameAr,
    nameFr: dish.nameFr,
    descriptionAr: dish.descriptionAr,
    descriptionFr: dish.descriptionFr,
    categoryId: dish.categoryId,
    price: dish.price,
    portionDescriptionAr: dish.portionDescriptionAr,
    portionDescriptionFr: dish.portionDescriptionFr,
    availableQuantity: dish.availableQuantity,
    preparationTimeMinutes: dish.preparationTimeMinutes,
    availabilityType: dish.availabilityType === 'preorder' ? 'today' : dish.availabilityType,
    useTimeWindow: Boolean(dish.availableFrom && dish.availableUntil),
    availableFrom: dish.availableFrom ?? '',
    availableUntil: dish.availableUntil ?? '',
    isDailyMenuItem: dish.isDailyMenuItem,
    isPreOrder: dish.isPreOrder,
    leadTimeHours: dish.leadTimeHours ?? 24,
    preOrderCutoffAt: dish.preOrderCutoffAt,
    spiceLevel: dish.spiceLevel,
    dietaryTags: dish.dietaryTags,
    allergens: dish.allergens,
    allergensDeclared: dish.allergensDeclared,
    isActive: dish.isActive,
  };
}

function SwitchRow({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <View>
      <View style={styles.switchRow}>
        <Text variant="bodyLarge" style={styles.flex}>
          {label}
        </Text>
        <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
      </View>
      {help ? (
        <Text variant="bodySmall" style={styles.muted}>
          {help}
        </Text>
      ) : null}
    </View>
  );
}

export function DishForm({ uid, dish, onSaved }: { uid: string; dish?: Dish; onSaved: (id: string) => void }) {
  const { t, pick } = useLocalized();
  const categories = useCategories();
  const save = useSaveDish(uid);
  const [images, setImages] = useState<string[]>(dish?.imageUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<DishFormValues>({
    resolver: zodResolver(dishSchema),
    defaultValues: dish ? dishToForm(dish) : emptyDish,
  });
  const isPreOrder = useWatch({ control, name: 'isPreOrder' });
  const useTimeWindow = useWatch({ control, name: 'useTimeWindow' });
  const allergensDeclared = useWatch({ control, name: 'allergensDeclared' });

  const addImage = async () => {
    setError(null);
    const uri = await pickImage({ aspect: [4, 3] });
    if (!uri) return;
    setUploading(true);
    try {
      const { url } = await uploadPublicImage(`dishes/${uid}`, uri);
      setImages((prev) => [...prev, url].slice(0, LIMITS.maxImagesPerDish));
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setUploading(false);
    }
  };

  const submit = handleSubmit(
    async (values) => {
      setError(null);
      try {
        const id = await save.mutateAsync({ id: dish?.id, values, imageUrls: images });
        onSaved(id);
      } catch (e) {
        setError(errorMessage(e, t));
      }
    },
    () => setError(t('validation.fixErrors')),
  );

  return (
    <>
      <SectionHeader title={t('dishForm.photos')} />
      <View style={styles.images}>
        {images.map((uri) => (
          <View key={uri} style={styles.imageBox}>
            <DishImage uri={uri} />
            <IconButton
              icon="close"
              size={16}
              mode="contained"
              style={styles.remove}
              onPress={() => setImages((prev) => prev.filter((u) => u !== uri))}
              accessibilityLabel={t('dishForm.removePhoto')}
            />
          </View>
        ))}
        {images.length < LIMITS.maxImagesPerDish ? (
          <Button
            mode="outlined"
            icon="camera-plus"
            onPress={() => void addImage()}
            loading={uploading}
            disabled={uploading}
            style={styles.addImage}
            contentStyle={styles.btn}
          >
            {t('dishForm.addPhoto')}
          </Button>
        ) : null}
      </View>
      <Text variant="bodySmall" style={styles.muted}>
        {t('dishForm.photoHelp')}
      </Text>

      <SectionHeader title={t('dishForm.basics')} />
      <FormField control={control} name="nameAr" label={t('dishForm.nameAr')} maxLength={80} style={styles.rtlInput} />
      <FormField control={control} name="nameFr" label={t('dishForm.nameFr')} maxLength={80} style={styles.ltrInput} />
      <Controller
        control={control}
        name="categoryId"
        render={({ field, fieldState }) => (
          <SelectField
            label={t('search.category')}
            value={field.value}
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: pick(c, 'name') }))}
            onChange={field.onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <FormField
        control={control}
        name="descriptionAr"
        label={t('dishForm.descriptionAr')}
        multiline
        maxLength={1000}
        style={styles.rtlInput}
      />
      <FormField
        control={control}
        name="descriptionFr"
        label={t('dishForm.descriptionFr')}
        multiline
        maxLength={1000}
        style={styles.ltrInput}
      />

      <SectionHeader title={t('dishForm.pricing')} />
      <FormField control={control} name="price" label={t('dishForm.price')} numeric helper={t('dishForm.priceHelp')} />
      <FormField
        control={control}
        name="portionDescriptionAr"
        label={t('dishForm.portionAr')}
        maxLength={120}
        style={styles.rtlInput}
      />
      <FormField
        control={control}
        name="portionDescriptionFr"
        label={t('dishForm.portionFr')}
        maxLength={120}
        style={styles.ltrInput}
      />

      <SectionHeader title={t('dishForm.availability')} />
      <FormField
        control={control}
        name="availableQuantity"
        label={t('dishForm.quantity')}
        numeric
        helper={t('dishForm.quantityHelp')}
      />
      <FormField control={control} name="preparationTimeMinutes" label={t('dishForm.prepTime')} numeric />
      <Controller
        control={control}
        name="availabilityType"
        render={({ field }) => (
          <ChipSelector
            label={t('dishForm.availabilityType')}
            multiple={false}
            options={[
              { value: 'today', label: t('dishForm.availableToday') },
              { value: 'always', label: t('dishForm.availableAlways') },
            ]}
            selected={[field.value === 'preorder' ? 'today' : field.value]}
            onChange={([v]) => field.onChange(v)}
          />
        )}
      />
      <Controller
        control={control}
        name="isDailyMenuItem"
        render={({ field }) => (
          <SwitchRow label={t('dishForm.dailyMenuItem')} value={field.value} onChange={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="useTimeWindow"
        render={({ field }) => (
          <SwitchRow
            label={t('dishForm.timeWindow')}
            value={field.value}
            onChange={field.onChange}
            help={t('dishForm.timeWindowHelp')}
          />
        )}
      />
      {useTimeWindow ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <FormField
              control={control}
              name="availableFrom"
              label={t('dishForm.from')}
              placeholder="11:00"
              maxLength={5}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.flex}>
            <FormField
              control={control}
              name="availableUntil"
              label={t('dishForm.until')}
              placeholder="14:30"
              maxLength={5}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      ) : null}

      <SectionHeader title={t('dishForm.preOrder')} />
      <Controller
        control={control}
        name="isPreOrder"
        render={({ field }) => (
          <SwitchRow
            label={t('dishForm.isPreOrder')}
            value={field.value}
            onChange={field.onChange}
            help={t('dishForm.preOrderHelp')}
          />
        )}
      />
      {isPreOrder ? (
        <FormField
          control={control}
          name="leadTimeHours"
          label={t('dishForm.leadTime')}
          numeric
          helper={t('dishForm.leadTimeHelp')}
        />
      ) : null}

      <SectionHeader title={t('dishForm.foodInfo')} />
      <Controller
        control={control}
        name="spiceLevel"
        render={({ field }) => (
          <ChipSelector
            label={t('dish.spiceLevel')}
            multiple={false}
            options={[0, 1, 2, 3].map((n) => ({ value: String(n), label: t(`spice.${n}`) }))}
            selected={[String(field.value)]}
            onChange={([v]) => field.onChange(Number(v))}
          />
        )}
      />
      <Controller
        control={control}
        name="dietaryTags"
        render={({ field }) => (
          <ChipSelector<DietaryTag>
            label={t('dish.dietary')}
            options={DIETARY_TAGS.map((tag) => ({ value: tag, label: t(`dietary.${tag}`) }))}
            selected={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="allergensDeclared"
        render={({ field }) => (
          <SwitchRow
            label={t('dishForm.declareAllergens')}
            value={field.value}
            onChange={field.onChange}
            help={t('dishForm.declareAllergensHelp')}
          />
        )}
      />
      {allergensDeclared ? (
        <Controller
          control={control}
          name="allergens"
          render={({ field }) => (
            <ChipSelector<Allergen>
              label={t('dish.allergens')}
              options={ALLERGENS.map((a) => ({ value: a, label: t(`allergen.${a}`) }))}
              selected={field.value}
              onChange={field.onChange}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <SwitchRow
            label={t('dishForm.publish')}
            value={field.value}
            onChange={field.onChange}
            help={t('dishForm.publishHelp')}
          />
        )}
      />

      {error ? (
        <HelperText type="error" accessibilityLiveRegion="assertive">
          {error}
        </HelperText>
      ) : null}
      <Button
        mode="contained"
        onPress={submit}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting || uploading}
        contentStyle={styles.btn}
      >
        {dish ? t('common.save') : t('dishForm.create')}
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  imageBox: { width: 96, height: 96, borderRadius: radius.sm, overflow: 'hidden' },
  remove: { position: 'absolute', top: 0, end: 0, margin: 2 },
  addImage: { justifyContent: 'center', height: 96 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  btn: { minHeight: 48 },
  muted: { color: palette.muted },
  rtlInput: { backgroundColor: palette.white, writingDirection: 'rtl', textAlign: 'right' },
  ltrInput: { backgroundColor: palette.white, writingDirection: 'ltr', textAlign: 'left' },
});
