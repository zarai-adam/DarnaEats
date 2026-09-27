import { LIMITS, TIME_SLOTS, TUNIS_UTC_OFFSET_MINUTES, type TimeSlot } from './constants';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Returns a Date whose UTC fields represent Tunis local wall-clock time. */
export function toTunisWallClock(date: Date): Date {
  return new Date(date.getTime() + TUNIS_UTC_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** YYYY-MM-DD in Tunis local time. */
export function tunisDateKey(date: Date = new Date()): string {
  return toTunisWallClock(date).toISOString().slice(0, 10);
}

/** Minutes since midnight in Tunis local time. */
export function tunisMinutesOfDay(date: Date = new Date()): number {
  const wall = toTunisWallClock(date);
  return wall.getUTCHours() * 60 + wall.getUTCMinutes();
}

export function parseHHmm(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidTimeSlot(value: string): value is TimeSlot {
  return (TIME_SLOTS as readonly string[]).includes(value);
}

/** UTC instant at which a Tunis-local slot starts. */
export function slotStartInstant(dateKey: string, slot: TimeSlot): Date {
  const startMinutes = parseHHmm(slot.slice(0, 5)) ?? 0;
  const midnightUtc = Date.parse(`${dateKey}T00:00:00Z`);
  return new Date(midnightUtc + (startMinutes - TUNIS_UTC_OFFSET_MINUTES) * MS_PER_MINUTE);
}

/** Upcoming date keys (today first) that buyers may schedule for. */
export function schedulableDates(now: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < LIMITS.maxScheduleDaysAhead; i += 1) {
    dates.push(tunisDateKey(new Date(now.getTime() + i * MS_PER_DAY)));
  }
  return dates;
}

/**
 * Slots for a date that start at least `leadMinutes` from now.
 */
export function availableSlots(dateKey: string, now: Date = new Date(), leadMinutes = 30): TimeSlot[] {
  const earliest = now.getTime() + leadMinutes * MS_PER_MINUTE;
  return TIME_SLOTS.filter((slot) => slotStartInstant(dateKey, slot).getTime() >= earliest);
}

export function isScheduleValid(dateKey: string, slot: string, now: Date = new Date(), leadMinutes = 30): boolean {
  if (!isValidDateKey(dateKey) || !isValidTimeSlot(slot)) return false;
  if (!schedulableDates(now).includes(dateKey)) return false;
  return slotStartInstant(dateKey, slot).getTime() >= now.getTime() + leadMinutes * MS_PER_MINUTE;
}
