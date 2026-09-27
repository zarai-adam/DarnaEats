/**
 * Domain constants shared by the mobile app and Cloud Functions.
 * Pure TypeScript only: no imports from React Native or Firebase SDKs.
 */

export const CURRENCY = 'TND' as const;

/** Tunisia has used a fixed UTC+1 offset (no DST) since 2009. */
export const TUNIS_UTC_OFFSET_MINUTES = 60;

export const ROLES = ['buyer', 'seller', 'admin', 'moderator'] as const;
export type Role = (typeof ROLES)[number];

export const SELLER_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended'] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'changes_requested',
  'approved',
  'rejected',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const IDENTITY_DOCUMENT_TYPES = ['national_id', 'passport', 'residence_permit'] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
  'disputed',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
];

export const PAYMENT_METHODS = ['cash_on_delivery'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['cash_pending', 'cash_collected', 'not_applicable'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_METHODS = ['pickup', 'seller_delivery'] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const AVAILABILITY_TYPES = ['today', 'preorder', 'always'] as const;
export type AvailabilityType = (typeof AVAILABILITY_TYPES)[number];

export const DIETARY_TAGS = [
  'halal',
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'nut_free',
  'spicy',
  'not_spicy',
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const ALLERGENS = [
  'gluten',
  'dairy',
  'eggs',
  'nuts',
  'peanuts',
  'sesame',
  'fish',
  'shellfish',
  'soy',
  'celery',
  'mustard',
  'sulphites',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const SPICE_LEVELS = [0, 1, 2, 3] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

export const REVIEW_STATUSES = ['visible', 'flagged', 'removed'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REPORT_TARGET_TYPES = [
  'seller',
  'buyer',
  'dish',
  'review',
  'order',
  'conversation',
  'hygiene',
  'other',
] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  'food_safety',
  'hygiene',
  'fraud',
  'fake_review',
  'harassment',
  'inappropriate_content',
  'wrong_order',
  'no_show',
  'misleading_listing',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];

export const MENU_STATUSES = ['draft', 'published', 'archived'] as const;
export type MenuStatus = (typeof MENU_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'order_created',
  'order_status_changed',
  'order_cancelled',
  'new_message',
  'new_review',
  'review_response',
  'seller_approved',
  'seller_rejected',
  'seller_changes_requested',
  'seller_suspended',
  'seller_reactivated',
  'admin_new_application',
  'admin_new_report',
  'admin_flagged_review',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const LANGUAGES = ['ar', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Limits enforced both client-side (UX) and server-side (authority). */
export const LIMITS = {
  maxCartItems: 20,
  maxItemQuantity: 20,
  maxOrderTotal: 2000,
  maxDishPrice: 1000,
  minDishPrice: 0.5,
  maxDishQuantity: 500,
  maxMessageLength: 1000,
  maxReviewLength: 1000,
  maxSellerResponseLength: 600,
  maxReportDescriptionLength: 2000,
  maxStoryLength: 1200,
  maxNotesLength: 300,
  maxAddressLength: 300,
  maxImageBytes: 5 * 1024 * 1024,
  maxImagesPerDish: 5,
  maxScheduleDaysAhead: 7,
  reportsPerUserPerDay: 10,
  messagesPerMinute: 20,
  ordersPerBuyerPerHour: 10,
} as const;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Hourly pickup/delivery windows offered to buyers (Tunis local time). */
export const TIME_SLOTS = [
  '08:00-09:00',
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00',
  '20:00-21:00',
  '21:00-22:00',
] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

/** Seller specialties offered in onboarding (labels live in the locale files). */
export const SPECIALTIES = [
  'couscous',
  'mloukhia',
  'tajine',
  'mlawi',
  'chapati',
  'bread',
  'tabouna',
  'kesra',
  'brik',
  'ojja',
  'kafteji',
  'lablabi',
  'makroudh',
  'baklawa',
  'pastries',
  'pasta',
  'rice',
  'fish',
  'soups',
  'salads',
  'vegetarian',
  'ramadan',
  'catering',
  'events',
  'regional',
  'djerba',
  'nabeul',
] as const;
export type Specialty = (typeof SPECIALTIES)[number];
