import { describe, expect, it } from 'vitest';
import {
  clampQuantity,
  computeTotals,
  isValidQuantity,
  lineSubtotal,
  roundMoney,
  totalQuantity,
} from '../../shared/pricing';

describe('pricing', () => {
  it('computes line subtotals without float drift', () => {
    expect(lineSubtotal({ unitPrice: 0.1, quantity: 3 })).toBe(0.3);
    expect(lineSubtotal({ unitPrice: 4.5, quantity: 3 })).toBe(13.5);
    expect(lineSubtotal({ unitPrice: 1.2, quantity: 7 })).toBe(8.4);
  });

  it('computes order totals including delivery fee', () => {
    const totals = computeTotals(
      [
        { unitPrice: 18, quantity: 2 },
        { unitPrice: 3.25, quantity: 3 },
      ],
      3.5,
    );
    expect(totals).toEqual({ subtotal: 45.75, deliveryFee: 3.5, total: 49.25 });
  });

  it('rejects invalid quantities and prices', () => {
    expect(() => lineSubtotal({ unitPrice: 5, quantity: 0 })).toThrow('invalid-quantity');
    expect(() => lineSubtotal({ unitPrice: 5, quantity: 1.5 })).toThrow('invalid-quantity');
    expect(() => lineSubtotal({ unitPrice: -1, quantity: 1 })).toThrow('invalid-price');
    expect(() => computeTotals([], -2)).toThrow('invalid-delivery-fee');
  });

  it('validates and clamps quantities against stock', () => {
    expect(isValidQuantity(3, 5)).toBe(true);
    expect(isValidQuantity(6, 5)).toBe(false);
    expect(isValidQuantity(0, 5)).toBe(false);
    expect(clampQuantity(10, 4)).toBe(4);
    expect(clampQuantity(0, 4)).toBe(1);
    expect(clampQuantity(3, 0)).toBe(0);
    expect(totalQuantity([{ quantity: 2 }, { quantity: 5 }])).toBe(7);
    expect(roundMoney(1.23456)).toBe(1.235);
  });
});
