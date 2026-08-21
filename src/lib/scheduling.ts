/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanySettings } from '../types';

export interface BookedRange {
  time: string; // HH:MM
  totalDurationMin: number;
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// True if a [start, start+duration) range would overlap any existing booked range.
export function hasTimeConflict(existing: BookedRange[], time: string, durationMin: number): boolean {
  const requestedStart = timeToMinutes(time);
  const requestedEnd = requestedStart + durationMin;

  return existing.some(a => {
    const start = timeToMinutes(a.time);
    const end = start + a.totalDurationMin;
    return (requestedStart >= start && requestedStart < end) ||
      (requestedEnd > start && requestedEnd <= end) ||
      (requestedStart <= start && requestedEnd >= end);
  });
}

// `dateStr` is YYYY-MM-DD. JS getDay(): 0 = Sunday ... 6 = Saturday, matching CompanySettings.workDays.
export function isWorkDay(settings: Pick<CompanySettings, 'workDays'>, dateStr: string): boolean {
  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
  return settings.workDays.includes(dayOfWeek);
}

// Generates every bookable slot for a day given business hours/lunch break, excluding slots where
// a booking of `requestedDurationMin` would either overlap an existing appointment or run past closing
// time. Pass `minTimeStr` (current wall-clock "HH:MM") when the requested day is today, so slots that
// have already gone by aren't offered — the caller decides this since this function has no notion of
// "today" on its own.
//
// Slots step by the requested service's own duration (not a fixed configured interval), starting from
// opening time — so a 90-minute service is offered every 90 minutes and a 30-minute one every 30,
// instead of every service being forced onto the same generic grid and leaving awkward unbookable gaps.
export function generateAvailableSlots(
  settings: Pick<CompanySettings, 'openTime' | 'closeTime' | 'lunchStart' | 'lunchEnd'>,
  bookedRanges: BookedRange[] = [],
  requestedDurationMin?: number,
  minTimeStr?: string
): string[] {
  const startMins = timeToMinutes(settings.openTime);
  const endMins = timeToMinutes(settings.closeTime);
  const duration = requestedDurationMin ?? 30;

  // Treat lunch as just another booked range so hasTimeConflict rejects any slot that would run
  // into it, not only ones literally starting during lunch (a real gap the old fixed-grid version
  // rarely hit, but a duration-based step makes appointments bleed into lunch far more likely).
  const blockedRanges = [...bookedRanges];
  if (settings.lunchStart && settings.lunchEnd) {
    const lunchDuration = timeToMinutes(settings.lunchEnd) - timeToMinutes(settings.lunchStart);
    blockedRanges.push({ time: settings.lunchStart, totalDurationMin: lunchDuration });
  }

  const slots: string[] = [];
  for (let m = startMins; m + duration <= endMins; m += duration) {
    slots.push(minutesToTime(m));
  }

  return slots
    .filter(slot => !minTimeStr || slot >= minTimeStr)
    .filter(slot => !hasTimeConflict(blockedRanges, slot, duration));
}
