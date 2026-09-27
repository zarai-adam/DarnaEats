import type {
  Allergen,
  AvailabilityType,
  DietaryTag,
  FulfillmentMethod,
  IdentityDocumentType,
  Language,
  MenuStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReportPriority,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ReviewStatus,
  Role,
  SellerStatus,
  VerificationStatus,
} from '@shared/constants';

/**
 * Client-side document shapes. Firestore Timestamps are converted to epoch
 * milliseconds by the converters so data is JSON-safe for the offline cache.
 */
type Millis = number;

export interface WithId {
  id: string;
}

export interface UserProfile extends WithId {
  role: Role;
  roles: Role[];
  displayName: string;
  phoneNumber: string | null;
  email: string | null;
  photoUrl: string | null;
  preferredLanguage: Language;
  acceptedTermsVersion: string | null;
  isActive: boolean;
  createdAt: Millis | null;
  updatedAt: Millis | null;
  lastLoginAt: Millis | null;
}

export interface SellerProfile extends WithId {
  userId: string;
  status: SellerStatus;
  displayName: string;
  story: string;
  profilePhotoUrl: string | null;
  kitchenPhotoUrl: string | null;
  specialties: string[];
  governorateId: string | null;
  cityId: string | null;
  serviceAreaId: string | null;
  serviceAreas: string[];
  approximateLatitude: number | null;
  approximateLongitude: number | null;
  pickupAvailable: boolean;
  selfDeliveryAvailable: boolean;
  deliveryFee: number;
  averageRating: number;
  reviewCount: number;
  orderCount: number;
  verifiedAt: Millis | null;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export interface SellerVerification extends WithId {
  sellerId: string;
  status: VerificationStatus;
  legalFullName: string;
  identityDocumentPath: string | null;
  identityDocumentType: IdentityDocumentType | null;
  kitchenPhotoPath: string | null;
  phoneVerified: boolean;
  hygieneAgreementAccepted: boolean;
  foodSafetyAgreementAccepted: boolean;
  submittedAt: Millis | null;
  reviewedAt: Millis | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
}

export interface SellerPrivate extends WithId {
  sellerId: string;
  pickupAddress: string;
  contactPhone: string | null;
  exactLatitude: number | null;
  exactLongitude: number | null;
}

export interface Category extends WithId {
  nameAr: string;
  nameFr: string;
  slug: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Governorate extends WithId {
  nameAr: string;
  nameFr: string;
  slug: string;
  isActive: boolean;
}

export interface City extends WithId {
  governorateId: string;
  nameAr: string;
  nameFr: string;
  slug: string;
  isActive: boolean;
}

export interface ServiceArea extends WithId {
  cityId: string;
  governorateId: string;
  nameAr: string;
  nameFr: string;
  approximateLatitude: number;
  approximateLongitude: number;
  isActive: boolean;
}

export interface AppSetting extends WithId {
  key: string;
  value: string | number | boolean;
  updatedAt: Millis | null;
  updatedBy: string | null;
}

export interface Dish extends WithId {
  sellerId: string;
  categoryId: string;
  nameAr: string;
  nameFr: string;
  descriptionAr: string;
  descriptionFr: string;
  imageUrls: string[];
  price: number;
  currency: 'TND';
  portionDescriptionAr: string;
  portionDescriptionFr: string;
  availableQuantity: number;
  preparationTimeMinutes: number;
  availabilityType: AvailabilityType;
  availableFrom: string | null;
  availableUntil: string | null;
  isDailyMenuItem: boolean;
  isPreOrder: boolean;
  preOrderCutoffAt: Millis | null;
  leadTimeHours: number | null;
  spiceLevel: number;
  dietaryTags: DietaryTag[];
  allergens: Allergen[];
  /** True when the cook explicitly declared allergens (possibly "none"). */
  allergensDeclared: boolean;
  isActive: boolean;
  isHidden: boolean;
  hiddenReason?: string | null;
  sellerApproved: boolean;
  // Server-maintained denormalised fields
  sellerName?: string;
  sellerRating?: number;
  sellerReviewCount?: number;
  serviceAreaId?: string | null;
  cityId?: string | null;
  governorateId?: string | null;
  approximateLatitude?: number | null;
  approximateLongitude?: number | null;
  pickupAvailable?: boolean;
  selfDeliveryAvailable?: boolean;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export interface DishSummary {
  id: string;
  nameAr: string;
  nameFr: string;
  price: number;
  imageUrl: string | null;
}

export interface Menu extends WithId {
  sellerId: string;
  date: string;
  titleAr: string;
  titleFr: string;
  descriptionAr: string;
  descriptionFr: string;
  dishIds: string[];
  status: MenuStatus;
  sellerApproved: boolean;
  dishSummaries?: DishSummary[];
  sellerName?: string;
  serviceAreaId?: string | null;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export interface Favorite extends WithId {
  buyerId: string;
  targetType: 'seller' | 'dish';
  targetId: string;
  sellerId: string;
  title: string;
  createdAt: Millis | null;
}

export interface CartItem {
  dishId: string;
  nameAr: string;
  nameFr: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceSnapshot: number;
  subtotal: number;
  maxQuantity: number;
  notes?: string;
}

export interface OrderItem {
  dishId: string;
  dishNameSnapshot: { ar: string; fr: string };
  imageUrlSnapshot: string | null;
  unitPriceSnapshot: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
}

export interface Order extends WithId {
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: 'TND';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentMethod: FulfillmentMethod;
  scheduledDate: string;
  scheduledTimeSlot: string;
  buyerNotes: string | null;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  pickupDetails: { address: string | null; latitude: number | null; longitude: number | null } | null;
  sellerNotes: string | null;
  reviewed: boolean;
  statusHistory: { status: OrderStatus; at: Millis; by: string }[];
  cancelReason: string | null;
  disputeReason?: string | null;
  createdAt: Millis | null;
  acceptedAt: Millis | null;
  readyAt: Millis | null;
  completedAt: Millis | null;
  cancelledAt: Millis | null;
}

export interface Review extends WithId {
  orderId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  sellerId: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  sellerResponse: string | null;
  sellerResponseAt: Millis | null;
  moderationReason?: string | null;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export interface AdminNote {
  by: string;
  at: Millis;
  text: string;
}

export interface Report extends WithId {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  relatedConversationId: string | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  adminNotes: AdminNote[];
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: Millis | null;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export interface Conversation extends WithId {
  buyerId: string;
  sellerId: string;
  participants: string[];
  buyerName: string;
  sellerName: string;
  orderId: string | null;
  lastMessageText: string | null;
  lastMessageAt: Millis | null;
  lastSenderId?: string;
  buyerUnread: number;
  sellerUnread: number;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export interface Message extends WithId {
  senderId: string;
  text: string;
  imagePath: string | null;
  isRead: boolean;
  createdAt: Millis | null;
}

export interface AppNotification extends WithId {
  userId: string;
  type: NotificationType;
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: Millis | null;
}

export interface AuditLog extends WithId {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Millis | null;
}
