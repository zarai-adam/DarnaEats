import type { FulfillmentMethod } from '@shared/constants';
import type { SellerProfile } from '@/types/models';

/**
 * Fulfillment abstraction. MVP providers: buyer pickup and seller-arranged
 * delivery. A `third_party_delivery` provider can be added later by
 * implementing this interface (and its server-side counterpart).
 */
export interface FulfillmentProvider {
  method: FulfillmentMethod;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  requiresAddress: boolean;
  isAvailableFor(seller: Pick<SellerProfile, 'pickupAvailable' | 'selfDeliveryAvailable'>): boolean;
  deliveryFee(seller: Pick<SellerProfile, 'deliveryFee'>): number;
}

export const PickupProvider: FulfillmentProvider = {
  method: 'pickup',
  labelKey: 'fulfillment.pickup',
  descriptionKey: 'fulfillment.pickupDescription',
  icon: 'storefront-outline',
  requiresAddress: false,
  isAvailableFor: (seller) => seller.pickupAvailable,
  deliveryFee: () => 0,
};

export const SellerDeliveryProvider: FulfillmentProvider = {
  method: 'seller_delivery',
  labelKey: 'fulfillment.sellerDelivery',
  descriptionKey: 'fulfillment.sellerDeliveryDescription',
  icon: 'moped-outline',
  requiresAddress: true,
  isAvailableFor: (seller) => seller.selfDeliveryAvailable,
  deliveryFee: (seller) => seller.deliveryFee ?? 0,
};

export const FULFILLMENT_PROVIDERS: readonly FulfillmentProvider[] = [PickupProvider, SellerDeliveryProvider];

export function getFulfillmentProvider(method: FulfillmentMethod): FulfillmentProvider {
  return FULFILLMENT_PROVIDERS.find((p) => p.method === method) ?? PickupProvider;
}
