import { describe, expect, it } from 'vitest';
import {
  getDishAvailability,
  isOrderable,
  requiredLeadMinutes,
  type AvailabilityInput,
} from '../../shared/availability';

const base: AvailabilityInput = {
  isActive: true,
  isHidden: false,
  sellerApproved: true,
  availableQuantity: 5,
  availabilityType: 'today',
  isPreOrder: false,
};

// 2026-09-26 11:00 UTC == 12:00 Tunis.
const noonTunis = new Date('2026-09-26T11:00:00Z');

describe('dish availability', () => {
  it('is available when active with stock', () => {
    expect(getDishAvailability(base, noonTunis)).toBe('available');
  });
  it('is sold out at zero quantity', () => {
    expect(getDishAvailability({ ...base, availableQuantity: 0 }, noonTunis)).toBe('sold_out');
    expect(isOrderable({ ...base, availableQuantity: 0 }, noonTunis)).toBe(false);
  });
  it('is unavailable when the seller is not approved or dish hidden', () => {
    expect(getDishAvailability({ ...base, sellerApproved: false }, noonTunis)).toBe('unavailable');
    expect(getDishAvailability({ ...base, isHidden: true }, noonTunis)).toBe('unavailable');
  });
  it('respects Tunis-local time windows', () => {
    expect(getDishAvailability({ ...base, availableFrom: '07:00', availableUntil: '11:00' }, noonTunis)).toBe(
      'outside_hours',
    );
    expect(getDishAvailability({ ...base, availableFrom: '11:30', availableUntil: '14:00' }, noonTunis)).toBe(
      'available',
    );
  });
  it('handles pre-orders and their cutoff', () => {
    const pre = { ...base, isPreOrder: true, availabilityType: 'preorder' as const, leadTimeHours: 24 };
    expect(getDishAvailability(pre, noonTunis)).toBe('preorder');
    expect(getDishAvailability({ ...pre, preOrderCutoffAt: noonTunis.getTime() - 1 }, noonTunis)).toBe(
      'preorder_closed',
    );
    expect(requiredLeadMinutes(pre, 60)).toBe(24 * 60);
    expect(requiredLeadMinutes(base, 10)).toBe(15);
  });
});
