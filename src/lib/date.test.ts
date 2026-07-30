/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { getTodayStr } from './date';

describe('getTodayStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(getTodayStr(new Date(2026, 6, 13))).toBe('2026-07-13'); // month is 0-indexed
  });

  it('pads single-digit months and days', () => {
    expect(getTodayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
