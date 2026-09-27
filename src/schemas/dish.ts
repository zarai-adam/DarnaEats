import { z } from 'zod';
import { ALLERGENS, AVAILABILITY_TYPES, DIETARY_TAGS, LIMITS } from '@shared/constants';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'validation.time');

/** Dish form. Error messages are i18n keys resolved by FormField. */
export const dishSchema = z
  .object({
    nameAr: z.string().trim().min(1, 'validation.required').max(80, 'validation.tooLong'),
    nameFr: z.string().trim().min(1, 'validation.required').max(80, 'validation.tooLong'),
    descriptionAr: z.string().trim().max(1000, 'validation.tooLong'),
    descriptionFr: z.string().trim().max(1000, 'validation.tooLong'),
    categoryId: z.string().min(1, 'validation.required'),
    price: z
      .number({ error: 'validation.number' })
      .min(LIMITS.minDishPrice, 'validation.priceRange')
      .max(LIMITS.maxDishPrice, 'validation.priceRange'),
    portionDescriptionAr: z.string().trim().max(120, 'validation.tooLong'),
    portionDescriptionFr: z.string().trim().max(120, 'validation.tooLong'),
    availableQuantity: z
      .number({ error: 'validation.number' })
      .int('validation.integer')
      .min(0, 'validation.quantityRange')
      .max(LIMITS.maxDishQuantity, 'validation.quantityRange'),
    preparationTimeMinutes: z
      .number({ error: 'validation.number' })
      .int('validation.integer')
      .min(0)
      .max(1440, 'validation.tooLong'),
    availabilityType: z.enum(AVAILABILITY_TYPES),
    useTimeWindow: z.boolean(),
    availableFrom: z.union([hhmm, z.literal('')]),
    availableUntil: z.union([hhmm, z.literal('')]),
    isDailyMenuItem: z.boolean(),
    isPreOrder: z.boolean(),
    leadTimeHours: z.number().int().min(0).max(168),
    preOrderCutoffAt: z.number().nullable(),
    spiceLevel: z.number().int().min(0).max(3),
    dietaryTags: z.array(z.enum(DIETARY_TAGS)).max(8),
    allergens: z.array(z.enum(ALLERGENS)).max(12),
    allergensDeclared: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => !v.useTimeWindow || (v.availableFrom !== '' && v.availableUntil !== ''), {
    path: ['availableUntil'],
    message: 'validation.timeWindow',
  })
  .refine((v) => !v.isPreOrder || v.leadTimeHours >= 1, { path: ['leadTimeHours'], message: 'validation.leadTime' });

export type DishFormValues = z.infer<typeof dishSchema>;

export const emptyDish: DishFormValues = {
  nameAr: '',
  nameFr: '',
  descriptionAr: '',
  descriptionFr: '',
  categoryId: '',
  price: 10,
  portionDescriptionAr: '',
  portionDescriptionFr: '',
  availableQuantity: 10,
  preparationTimeMinutes: 30,
  availabilityType: 'today',
  useTimeWindow: false,
  availableFrom: '',
  availableUntil: '',
  isDailyMenuItem: false,
  isPreOrder: false,
  leadTimeHours: 24,
  preOrderCutoffAt: null,
  spiceLevel: 0,
  dietaryTags: [],
  allergens: [],
  allergensDeclared: false,
  isActive: true,
};
