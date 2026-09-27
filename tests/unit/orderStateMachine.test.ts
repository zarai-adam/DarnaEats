import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  isTerminalStatus,
  shouldRestoreInventory,
} from '../../shared/orderStateMachine';

describe('order state machine', () => {
  it('allows the documented happy path for pickup', () => {
    expect(canTransition('pending', 'accepted', 'seller', 'pickup')).toBe(true);
    expect(canTransition('accepted', 'preparing', 'seller', 'pickup')).toBe(true);
    expect(canTransition('preparing', 'ready', 'seller', 'pickup')).toBe(true);
    expect(canTransition('ready', 'completed', 'buyer', 'pickup')).toBe(true);
  });

  it('allows out_for_delivery only for seller delivery orders', () => {
    expect(canTransition('ready', 'out_for_delivery', 'seller', 'seller_delivery')).toBe(true);
    expect(canTransition('ready', 'out_for_delivery', 'seller', 'pickup')).toBe(false);
    expect(canTransition('out_for_delivery', 'completed', 'buyer', 'seller_delivery')).toBe(true);
  });

  it('rejects skipping states and wrong actors', () => {
    expect(canTransition('pending', 'ready', 'seller', 'pickup')).toBe(false);
    expect(canTransition('pending', 'accepted', 'buyer', 'pickup')).toBe(false);
    expect(canTransition('preparing', 'ready', 'buyer', 'pickup')).toBe(false);
    expect(canTransition('preparing', 'cancelled', 'buyer', 'pickup')).toBe(false);
    expect(canTransition('completed', 'pending', 'admin', 'pickup')).toBe(false);
    expect(canTransition('cancelled', 'accepted', 'seller', 'pickup')).toBe(false);
  });

  it('lets both parties dispute eligible states but not pending', () => {
    expect(canTransition('accepted', 'disputed', 'buyer', 'pickup')).toBe(true);
    expect(canTransition('completed', 'disputed', 'seller', 'pickup')).toBe(true);
    expect(canTransition('pending', 'disputed', 'buyer', 'pickup')).toBe(false);
  });

  it('lists allowed transitions per actor', () => {
    expect(allowedTransitions('pending', 'seller', 'pickup').sort()).toEqual(['accepted', 'cancelled']);
    expect(allowedTransitions('pending', 'buyer', 'pickup')).toEqual(['cancelled']);
    expect(allowedTransitions('ready', 'seller', 'seller_delivery').sort()).toEqual([
      'completed',
      'disputed',
      'out_for_delivery',
    ]);
  });

  it('knows terminal states and inventory restoration', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('ready')).toBe(false);
    expect(shouldRestoreInventory('accepted', 'cancelled')).toBe(true);
    expect(shouldRestoreInventory('ready', 'completed')).toBe(false);
  });
});
