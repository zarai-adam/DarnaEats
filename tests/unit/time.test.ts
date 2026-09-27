import { describe, expect, it } from 'vitest';
import { availableSlots, isScheduleValid, schedulableDates, slotStartInstant, tunisDateKey } from '../../shared/time';

describe('Tunis scheduling', () => {
  const now = new Date('2026-09-26T22:30:00Z'); // 23:30 Tunis, same day

  it('uses Tunis local date', () => {
    expect(tunisDateKey(now)).toBe('2026-09-26');
    expect(tunisDateKey(new Date('2026-09-26T23:30:00Z'))).toBe('2026-09-27');
  });
  it('maps slots to the right UTC instant', () => {
    expect(slotStartInstant('2026-09-27', '12:00-13:00').toISOString()).toBe('2026-09-27T11:00:00.000Z');
  });
  it('offers only future slots within the scheduling window', () => {
    expect(availableSlots('2026-09-26', now)).toEqual([]);
    expect(availableSlots('2026-09-27', now)[0]).toBe('08:00-09:00');
    expect(schedulableDates(now)).toHaveLength(7);
  });
  it('validates schedules including lead time', () => {
    expect(isScheduleValid('2026-09-27', '08:00-09:00', now, 30)).toBe(true);
    expect(isScheduleValid('2026-09-27', '08:00-09:00', now, 24 * 60)).toBe(false);
    expect(isScheduleValid('2026-09-27', '08:30-09:30', now)).toBe(false);
    expect(isScheduleValid('2026-13-01', '08:00-09:00', now)).toBe(false);
    expect(isScheduleValid('2026-10-20', '08:00-09:00', now)).toBe(false);
  });
});
