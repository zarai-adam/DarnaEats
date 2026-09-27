import type { AvailabilityType } from './constants';
import { parseHHmm, tunisMinutesOfDay } from './time';

export interface AvailabilityInput {
  isActive: boolean;
  isHidden: boolean;
  sellerApproved: boolean;
  availableQuantity: number;
  availabilityType: AvailabilityType;
  availableFrom?: string | null;
  availableUntil?: string | null;
  isPreOrder: boolean;
  leadTimeHours?: number | null;
  preOrderCutoffAt?: number | null;
}

export type AvailabilityState =
  'available' | 'preorder' | 'sold_out' | 'outside_hours' | 'preorder_closed' | 'unavailable';

export function getDishAvailability(dish: AvailabilityInput, now: Date = new Date()): AvailabilityState {
  if (!dish.isActive || dish.isHidden || !dish.sellerApproved) return 'unavailable';
  if (dish.availableQuantity <= 0) return 'sold_out';

  if (dish.isPreOrder || dish.availabilityType === 'preorder') {
    if (dish.preOrderCutoffAt && now.getTime() > dish.preOrderCutoffAt) return 'preorder_closed';
    return 'preorder';
  }

  if (dish.availableFrom && dish.availableUntil) {
    const from = parseHHmm(dish.availableFrom);
    const until = parseHHmm(dish.availableUntil);
    const current = tunisMinutesOfDay(now);
    if (from !== null && until !== null) {
      const inWindow = from <= until ? current >= from && current <= until : current >= from || current <= until;
      if (!inWindow) return 'outside_hours';
    }
  }
  return 'available';
}

/** Whether a new order can include this dish right now (pre-orders included). */
export function isOrderable(dish: AvailabilityInput, now: Date = new Date()): boolean {
  const state = getDishAvailability(dish, now);
  return state === 'available' || state === 'preorder' || state === 'outside_hours';
}

/** Minimum minutes between ordering and the scheduled slot for this dish. */
export function requiredLeadMinutes(
  dish: Pick<AvailabilityInput, 'isPreOrder' | 'availabilityType' | 'leadTimeHours'>,
  preparationTimeMinutes: number,
): number {
  const prep = Math.max(15, preparationTimeMinutes);
  if (dish.isPreOrder || dish.availabilityType === 'preorder') {
    return Math.max(prep, (dish.leadTimeHours ?? 0) * 60);
  }
  return prep;
}
