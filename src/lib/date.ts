/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Local calendar date as YYYY-MM-DD, matching the format used for all `date` fields in this app.
export function getTodayStr(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  const day = String(reference.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
