/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';
import { Company } from '../types';

// Builds the per-tenant CSS variable overrides shared by every tenant-facing screen (backoffice,
// public booking page, tablet mode). Background/menu/text only override the platform defaults
// when the manager actually set them — most tenants stay on the base "Encadernado" look.
// Must override --color-paper/--color-rail/--color-ink directly (not an intermediate variable) —
// see the comment in index.css on why indirection breaks the cascade for custom properties.
export function buildBrandStyle(company: Company | null): CSSProperties {
  const style: Record<string, string> = {
    '--color-brand-primary': company?.primaryColor || '#ba8b3f',
    '--color-brand-secondary': company?.secondaryColor || '#6f2f40',
  };
  if (company?.backgroundColor) style['--color-paper'] = company.backgroundColor;
  if (company?.menuColor) style['--color-rail'] = company.menuColor;
  if (company?.textColor) style['--color-ink'] = company.textColor;
  return style as CSSProperties;
}
