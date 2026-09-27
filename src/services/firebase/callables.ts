import { httpsCallable } from 'firebase/functions';
import type { OrderStatus, ReportReason, ReportTargetType } from '@shared/constants';
import type { SellerDecision } from '@shared/sellerApproval';
import { functions } from './app';

function callable<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (data: Req): Promise<Res> => (await fn(data)).data;
}

export interface PlaceOrderInput {
  idempotencyKey: string;
  sellerId: string;
  items: { dishId: string; quantity: number; notes?: string }[];
  fulfillmentMethod: 'pickup' | 'seller_delivery';
  scheduledDate: string;
  scheduledTimeSlot: string;
  buyerNotes?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  paymentMethod: 'cash_on_delivery';
}

export interface AdminStats {
  totalUsers: number;
  activeSellers: number;
  pendingApplications: number;
  activeDishes: number;
  ordersToday: number;
  completedOrders: number;
  openReports: number;
  flaggedReviews: number;
  averageRating: number | null;
}

export interface AdminAnalytics {
  ordersByStatus: Record<string, number>;
  sellersByGovernorate: Record<string, number>;
  completedOrderValue: number;
  buyers: number;
  sellers: number;
}

export interface InspectedConversation {
  buyerId: string;
  sellerId: string;
  messages: { id: string; senderId: string; text: string; hasImage: boolean; createdAt: number | null }[];
}

/** Typed wrappers for every privileged backend operation. */
export const api = {
  ensureUserProfile: callable<
    { displayName?: string; preferredLanguage?: 'ar' | 'fr'; acceptedTermsVersion?: string },
    { created: boolean; roles: string[]; role: string; claimsUpdated: boolean }
  >('ensureUserProfile'),
  becomeSeller: callable<Record<string, never>, { ok: boolean }>('becomeSeller'),
  submitSellerApplication: callable<Record<string, never>, { ok: boolean; missing: string[] }>(
    'submitSellerApplication',
  ),
  reviewSellerApplication: callable<
    { sellerId: string; decision: SellerDecision; reason?: string; adminNotes?: string },
    { ok: boolean; status: string }
  >('reviewSellerApplication'),
  placeOrder: callable<PlaceOrderInput, { orderId: string; orderNumber: string; total: number; duplicate: boolean }>(
    'placeOrder',
  ),
  updateOrderStatus: callable<
    { orderId: string; status: OrderStatus; reason?: string; sellerNotes?: string },
    { ok: boolean; status: OrderStatus }
  >('updateOrderStatus'),
  submitReview: callable<{ orderId: string; rating: number; comment?: string }, { ok: boolean; reviewId: string }>(
    'submitReview',
  ),
  respondToReview: callable<{ reviewId: string; response: string }, { ok: boolean }>('respondToReview'),
  flagReview: callable<{ reviewId: string; reason: ReportReason; description?: string }, { ok: boolean }>('flagReview'),
  moderateReview: callable<
    { reviewId: string; action: 'remove' | 'restore' | 'dismiss_flag'; reason: string },
    { ok: boolean }
  >('moderateReview'),
  createReport: callable<
    { targetType: ReportTargetType; targetId: string; reason: ReportReason; description?: string },
    { ok: boolean; reportId: string }
  >('createReport'),
  updateReport: callable<
    {
      reportId: string;
      status?: string;
      priority?: string;
      note?: string;
      resolution?: string;
      action?: 'none' | 'hide_dish' | 'remove_review' | 'suspend_seller';
      actionReason?: string;
    },
    { ok: boolean }
  >('updateReport'),
  setDishHidden: callable<{ dishId: string; hidden: boolean; reason: string }, { ok: boolean }>('setDishHidden'),
  adminGetStats: callable<Record<string, never>, AdminStats>('adminGetStats'),
  adminGetAnalytics: callable<Record<string, never>, AdminAnalytics>('adminGetAnalytics'),
  adminSetUserRoles: callable<{ uid: string; roles: string[]; reason: string }, { ok: boolean }>('adminSetUserRoles'),
  adminSetUserActive: callable<{ uid: string; active: boolean; reason: string }, { ok: boolean }>('adminSetUserActive'),
  adminSaveCatalogEntity: callable<
    {
      collection: 'categories' | 'governorates' | 'cities' | 'serviceAreas' | 'appSettings';
      id?: string;
      data: Record<string, unknown>;
    },
    { ok: boolean; id: string }
  >('adminSaveCatalogEntity'),
  adminInspectConversation: callable<{ conversationId: string; reportId: string }, InspectedConversation>(
    'adminInspectConversation',
  ),
  adminLogVerificationAccess: callable<{ sellerId: string }, { ok: boolean }>('adminLogVerificationAccess'),
};
