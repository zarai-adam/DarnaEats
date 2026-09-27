import { z } from 'zod';
import { IDENTITY_DOCUMENT_TYPES, LIMITS } from '@shared/constants';

export const storefrontSchema = z.object({
  displayName: z.string().trim().min(2, 'validation.required').max(60, 'validation.tooLong'),
  story: z.string().trim().min(20, 'validation.storyMin').max(LIMITS.maxStoryLength, 'validation.tooLong'),
  specialties: z.array(z.string()).min(1, 'validation.specialtiesMin').max(10, 'validation.tooMany'),
});
export type StorefrontValues = z.infer<typeof storefrontSchema>;

export const serviceAreaSchema = z
  .object({
    governorateId: z.string().min(1, 'validation.required'),
    cityId: z.string().min(1, 'validation.required'),
    serviceAreaId: z.string().min(1, 'validation.required'),
    pickupAvailable: z.boolean(),
    selfDeliveryAvailable: z.boolean(),
    deliveryFee: z.number({ error: 'validation.number' }).min(0).max(50, 'validation.deliveryFee'),
    pickupAddress: z.string().trim().max(LIMITS.maxAddressLength, 'validation.tooLong'),
  })
  .refine((v) => v.pickupAvailable || v.selfDeliveryAvailable, {
    path: ['pickupAvailable'],
    message: 'validation.fulfillmentRequired',
  })
  .refine((v) => !v.pickupAvailable || v.pickupAddress.length >= 5, {
    path: ['pickupAddress'],
    message: 'validation.pickupAddress',
  });
export type ServiceAreaValues = z.infer<typeof serviceAreaSchema>;

export const identitySchema = z.object({
  legalFullName: z.string().trim().min(3, 'validation.required').max(120, 'validation.tooLong'),
  identityDocumentType: z.enum(IDENTITY_DOCUMENT_TYPES, { error: 'validation.required' }),
});
export type IdentityValues = z.infer<typeof identitySchema>;
