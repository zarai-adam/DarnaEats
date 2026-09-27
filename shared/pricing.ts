import { LIMITS } from './constants';

/** Money is handled in millimes (1 TND = 1000 millimes) to avoid float drift. */
export function toMillimes(amount: number): number {
  return Math.round(amount * 1000);
}

export function fromMillimes(millimes: number): number {
  return Math.round(millimes) / 1000;
}

export function roundMoney(amount: number): number {
  return fromMillimes(toMillimes(amount));
}

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export function lineSubtotal(line: PricedLine): number {
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
    throw new Error('invalid-quantity');
  }
  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
    throw new Error('invalid-price');
  }
  return fromMillimes(toMillimes(line.unitPrice) * line.quantity);
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export function computeTotals(lines: readonly PricedLine[], deliveryFee = 0): OrderTotals {
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    throw new Error('invalid-delivery-fee');
  }
  const subtotalMillimes = lines.reduce((sum, line) => sum + toMillimes(lineSubtotal(line)), 0);
  const deliveryMillimes = toMillimes(deliveryFee);
  return {
    subtotal: fromMillimes(subtotalMillimes),
    deliveryFee: fromMillimes(deliveryMillimes),
    total: fromMillimes(subtotalMillimes + deliveryMillimes),
  };
}

export function totalQuantity(lines: readonly { quantity: number }[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function isValidQuantity(quantity: number, available: number): boolean {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= LIMITS.maxItemQuantity && quantity <= available;
}

/** Clamp a requested quantity to what can actually be ordered. */
export function clampQuantity(requested: number, available: number): number {
  const max = Math.min(available, LIMITS.maxItemQuantity);
  if (max <= 0) return 0;
  return Math.max(1, Math.min(Math.floor(requested), max));
}
