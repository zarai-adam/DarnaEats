import type { PaymentMethod } from '@shared/constants';

/**
 * Client-side description of available payment methods. The authoritative
 * PaymentProvider implementation lives in Cloud Functions
 * (functions/src/services/payments.ts). Adding a digital provider later means
 * implementing it server-side and registering its descriptor here.
 */
export interface PaymentMethodDescriptor {
  method: PaymentMethod;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  requiresOnlineConfirmation: boolean;
}

export const PAYMENT_METHODS: readonly PaymentMethodDescriptor[] = [
  {
    method: 'cash_on_delivery',
    labelKey: 'payment.cashOnDelivery',
    descriptionKey: 'payment.cashOnDeliveryDescription',
    icon: 'cash',
    requiresOnlineConfirmation: false,
  },
];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cash_on_delivery';
