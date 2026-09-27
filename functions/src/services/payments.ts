import type { PaymentMethod, PaymentStatus } from '../shared/constants';
import { fail } from '../lib/errors';

/**
 * Payment boundary. Only cash on delivery exists in the MVP; digital
 * providers (D17, Flouci, cards...) will implement this same interface.
 */
export interface PaymentProvider {
  readonly method: PaymentMethod;
  createPayment(input: { orderId: string; amount: number; currency: 'TND' }): { status: PaymentStatus };
  confirmPayment(input: { orderId: string }): { status: PaymentStatus };
  refundPayment(input: { orderId: string }): { status: PaymentStatus };
  getPaymentStatus(input: { orderId: string; current: PaymentStatus }): PaymentStatus;
}

export const CashOnDeliveryProvider: PaymentProvider = {
  method: 'cash_on_delivery',
  createPayment: () => ({ status: 'cash_pending' }),
  // Cash is collected by the seller at handover; completion marks it collected.
  confirmPayment: () => ({ status: 'cash_collected' }),
  // Nothing was charged, so a cancellation has nothing to refund.
  refundPayment: () => ({ status: 'not_applicable' }),
  getPaymentStatus: ({ current }) => current,
};

const PROVIDERS: Record<PaymentMethod, PaymentProvider> = {
  cash_on_delivery: CashOnDeliveryProvider,
};

export function getPaymentProvider(method: string): PaymentProvider {
  const provider = PROVIDERS[method as PaymentMethod];
  if (!provider) fail('invalid-argument', 'payment/unsupported-method');
  return provider;
}
