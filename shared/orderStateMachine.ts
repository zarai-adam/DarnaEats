import type { FulfillmentMethod, OrderStatus } from './constants';

export type OrderActor = 'buyer' | 'seller' | 'admin';

interface TransitionRule {
  to: OrderStatus;
  actors: readonly OrderActor[];
  /** Restricts the transition to a fulfillment method. */
  fulfillment?: FulfillmentMethod;
}

/**
 * Single source of truth for order lifecycle rules. Enforced server-side by
 * the `updateOrderStatus` Cloud Function and used client-side to decide which
 * buttons to show.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly TransitionRule[]> = {
  pending: [
    { to: 'accepted', actors: ['seller'] },
    { to: 'cancelled', actors: ['buyer', 'seller', 'admin'] },
  ],
  accepted: [
    { to: 'preparing', actors: ['seller'] },
    { to: 'cancelled', actors: ['buyer', 'seller', 'admin'] },
    { to: 'disputed', actors: ['buyer', 'seller'] },
  ],
  preparing: [
    { to: 'ready', actors: ['seller'] },
    { to: 'disputed', actors: ['buyer', 'seller'] },
  ],
  ready: [
    { to: 'completed', actors: ['buyer', 'seller'] },
    { to: 'out_for_delivery', actors: ['seller'], fulfillment: 'seller_delivery' },
    { to: 'disputed', actors: ['buyer', 'seller'] },
  ],
  out_for_delivery: [
    { to: 'completed', actors: ['buyer', 'seller'] },
    { to: 'disputed', actors: ['buyer', 'seller'] },
  ],
  completed: [{ to: 'disputed', actors: ['buyer', 'seller'] }],
  cancelled: [],
  disputed: [
    { to: 'completed', actors: ['admin'] },
    { to: 'cancelled', actors: ['admin'] },
  ],
};

/** A completed order can only be disputed within this window. */
export const DISPUTE_WINDOW_HOURS = 48;

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
  fulfillment: FulfillmentMethod,
): boolean {
  return ORDER_TRANSITIONS[from].some(
    (rule) =>
      rule.to === to &&
      rule.actors.includes(actor) &&
      (rule.fulfillment === undefined || rule.fulfillment === fulfillment),
  );
}

export function allowedTransitions(
  from: OrderStatus,
  actor: OrderActor,
  fulfillment: FulfillmentMethod,
): OrderStatus[] {
  return ORDER_TRANSITIONS[from]
    .filter(
      (rule) => rule.actors.includes(actor) && (rule.fulfillment === undefined || rule.fulfillment === fulfillment),
    )
    .map((rule) => rule.to);
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'completed';
}

/** Inventory is returned to the dish only when an order is cancelled. */
export function shouldRestoreInventory(from: OrderStatus, to: OrderStatus): boolean {
  return to === 'cancelled' && from !== 'cancelled';
}

/** Timestamp field set when entering each status. */
export const STATUS_TIMESTAMP_FIELD: Partial<Record<OrderStatus, string>> = {
  accepted: 'acceptedAt',
  preparing: 'preparingAt',
  ready: 'readyAt',
  out_for_delivery: 'outForDeliveryAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
  disputed: 'disputedAt',
};
