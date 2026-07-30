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
// a booking of `requestedDurationMin` would either overlap an existing appointment or run past closing time.
export function generateAvailableSlots(
  settings: Pick<CompanySettings, 'openTime' | 'closeTime' | 'lunchStart' | 'lunchEnd' | 'slotIntervalMin'>,
  bookedRanges: BookedRange[] = [],
  requestedDurationMin?: number
): string[] {
  const startMins = timeToMinutes(settings.openTime);
  const endMins = timeToMinutes(settings.closeTime);
  const interval = settings.slotIntervalMin || 30;
  const duration = requestedDurationMin ?? interval;

  const slots: string[] = [];
  for (let m = startMins; m + duration <= endMins; m += interval) {
    if (settings.lunchStart && settings.lunchEnd) {
      const lunchStartMins = timeToMinutes(settings.lunchStart);
      const lunchEndMins = timeToMinutes(settings.lunchEnd);
      if (m >= lunchStartMins && m < lunchEndMins) {
        continue;
      }
    }
    slots.push(minutesToTime(m));
  }

  return slots.filter(slot => !hasTimeConflict(bookedRanges, slot, duration));
}
