/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Formats digits as the user types into a Brazilian phone mask: "(XX) XXXXX-XXXX" for mobile
// (11 digits) or "(XX) XXXX-XXXX" for landline (10 digits) — shifts automatically once the 11th
// digit is typed. Accepts already-formatted input too, so it's safe to run on every keystroke.
export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
