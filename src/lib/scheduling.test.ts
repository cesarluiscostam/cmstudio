/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { timeToMinutes, minutesToTime, hasTimeConflict, isWorkDay, generateAvailableSlots } from './scheduling';

describe('timeToMinutes / minutesToTime', () => {
  it('converts HH:MM to minutes and back', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(0)).toBe('00:00');
  });
});

describe('hasTimeConflict', () => {
  const existing = [{ time: '10:30', totalDurationMin: 75 }]; // 10:30 - 11:45

  it('detects an overlap when the new booking starts inside an existing one', () => {
    expect(hasTimeConflict(existing, '11:00', 30)).toBe(true);
  });

  it('detects an overlap when the new booking fully contains an existing one', () => {
    expect(hasTimeConflict(existing, '10:00', 180)).toBe(true);
  });

  it('allows a booking that ends exactly when the existing one starts', () => {
    expect(hasTimeConflict(existing, '10:00', 30)).toBe(false);
  });

  it('allows a booking that starts exactly when the existing one ends', () => {
    expect(hasTimeConflict(existing, '11:45', 30)).toBe(false);
  });

  it('returns false when there are no existing bookings', () => {
    expect(hasTimeConflict([], '11:00', 30)).toBe(false);
  });
});

describe('isWorkDay', () => {
  it('returns true when the date falls on a configured work day', () => {
    // 2026-07-13 is a Monday (day 1)
    expect(isWorkDay({ workDays: [1, 2, 3, 4, 5, 6] }, '2026-07-13')).toBe(true);
  });

  it('returns false when the date falls on a day off', () => {
    // 2026-08-02 is a Sunday (day 0)
    expect(isWorkDay({ workDays: [1, 2, 3, 4, 5, 6] }, '2026-08-02')).toBe(false);
  });
});

describe('generateAvailableSlots', () => {
  const settings = {
    openTime: '09:00',
    closeTime: '12:00',
    lunchStart: undefined,
    lunchEnd: undefined,
  };

  it('defaults to 30-minute steps when no service duration is given', () => {
    expect(generateAvailableSlots(settings, [])).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  it('steps by the requested service duration instead of a fixed interval', () => {
    // 90-minute steps from 09:00: 09:00, 10:30 (next would be 12:00, which leaves no room to finish by close)
    expect(generateAvailableSlots(settings, [], 90)).toEqual(['09:00', '10:30']);
  });

  it('excludes slots that overlap an existing booking', () => {
    const slots = generateAvailableSlots(settings, [{ time: '10:00', totalDurationMin: 60 }]);
    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('10:30');
    expect(slots).toContain('09:30');
    expect(slots).toContain('11:00');
  });

  it('skips slots during the lunch break', () => {
    const withLunch = { ...settings, lunchStart: '10:00', lunchEnd: '11:00' };
    const slots = generateAvailableSlots(withLunch, []);
    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('10:30');
    expect(slots).toContain('09:30');
    expect(slots).toContain('11:00');
  });

  it('excludes a slot that would run into lunch even if it starts before lunch begins', () => {
    // A 40-minute service at 10:20 would run until 11:00, bleeding into a 10:30-11:30 lunch —
    // the old fixed-grid version only checked whether a slot's *start* fell inside lunch.
    const withLunch = { ...settings, lunchStart: '10:30', lunchEnd: '11:30' };
    const slots = generateAvailableSlots(withLunch, [], 40);
    expect(slots).toEqual(['09:00', '09:40']);
  });

  it('never offers a slot whose requested duration would run past closing time', () => {
    const slots = generateAvailableSlots(settings, [], 90);
    expect(slots).not.toContain('11:00'); // would end at 12:30, past the 12:00 close
  });

  it('excludes slots earlier than minTimeStr, for filtering out already-passed times today', () => {
    const slots = generateAvailableSlots(settings, [], undefined, '10:15');
    expect(slots).not.toContain('09:00');
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('10:30');
    expect(slots).toContain('11:30');
  });

  it('does not filter by time when minTimeStr is omitted (e.g. a future date)', () => {
    const slots = generateAvailableSlots(settings, []);
    expect(slots).toContain('09:00');
  });
});
