import { z } from 'zod';
import { FULFILLMENT_METHODS, LIMITS } from '@shared/constants';

export const checkoutSchema = z
  .object({
    fulfillmentMethod: z.enum(FULFILLMENT_METHODS),
    scheduledDate: z.string().min(1, 'validation.required'),
    scheduledTimeSlot: z.string().min(1, 'validation.slotRequired'),
    deliveryAddress: z.string().trim().max(LIMITS.maxAddressLength, 'validation.tooLong'),
    buyerNotes: z.string().trim().max(LIMITS.maxNotesLength, 'validation.tooLong'),
  })
  .refine((v) => v.fulfillmentMethod !== 'seller_delivery' || v.deliveryAddress.length >= 5, {
    path: ['deliveryAddress'],
    message: 'validation.addressRequired',
  });
export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'validation.rating').max(5),
  comment: z.string().trim().max(LIMITS.maxReviewLength, 'validation.tooLong'),
});
export type ReviewValues = z.infer<typeof reviewSchema>;

export const reportSchema = z.object({
  reason: z.string().min(1, 'validation.required'),
  description: z.string().trim().max(LIMITS.maxReportDescriptionLength, 'validation.tooLong'),
});
export type ReportValues = z.infer<typeof reportSchema>;
