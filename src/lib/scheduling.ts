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

// Generates every bookable slot for a day given business hours/lunch break, packing slots by the
// requested service's own duration (not a fixed configured interval) into the day's actual free gaps
// — so the moment an appointment ends becomes the next offered slot, rather than being constrained to
// a rigid grid anchored at opening time. Pass `minTimeStr` (current wall-clock "HH:MM") when the
// requested day is today, so slots that have already gone by aren't offered — the caller decides this
// since this function has no notion of "today" on its own.
export function generateAvailableSlots(
  settings: Pick<CompanySettings, 'openTime' | 'closeTime' | 'lunchStart' | 'lunchEnd'>,
  bookedRanges: BookedRange[] = [],
  requestedDurationMin?: number,
  minTimeStr?: string
): string[] {
  const startMins = timeToMinutes(settings.openTime);
  const endMins = timeToMinutes(settings.closeTime);
  const duration = requestedDurationMin ?? 30;

  // Lunch is just another blocked range alongside real bookings, so a candidate slot that would run
  // into it (not only ones literally starting during lunch) gets skipped the same way.
  const busy: Array<[number, number]> = bookedRanges.map(b => {
    const s = timeToMinutes(b.time);
    return [s, s + b.totalDurationMin] as [number, number];
  });
  if (settings.lunchStart && settings.lunchEnd) {
    busy.push([timeToMinutes(settings.lunchStart), timeToMinutes(settings.lunchEnd)]);
  }
  busy.sort((a, b) => a[0] - b[0]);

  // Merge overlapping/touching busy ranges so the walk below only has to deal with clean, disjoint blocks.
  const merged: Array<[number, number]> = [];
  for (const range of busy) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range]);
    }
  }

  // Walk the day: pack as many duration-spaced slots as fit before each busy block, then jump the
  // cursor past it and continue — this is what makes 08:15 show up right after a 7:15-8:15 booking
  // instead of being skipped over by a grid that never lands exactly there.
  const slots: string[] = [];
  let cursor = startMins;
  for (const [busyStart, busyEnd] of merged) {
    const gapEnd = Math.min(busyStart, endMins);
    while (cursor + duration <= gapEnd) {
      slots.push(minutesToTime(cursor));
      cursor += duration;
    }
    cursor = Math.max(cursor, busyEnd);
  }
  while (cursor + duration <= endMins) {
    slots.push(minutesToTime(cursor));
    cursor += duration;
  }

  return slots.filter(slot => !minTimeStr || slot >= minTimeStr);
}
