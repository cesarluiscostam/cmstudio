/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

// Ref-backed callback so the listener isn't torn down/rebuilt on every render —
// only re-subscribes when the modal actually opens or closes.
export function useEscapeKey(onEscape: () => void, enabled: boolean) {
  const callbackRef = useRef(onEscape);
  callbackRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') callbackRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled]);
}
