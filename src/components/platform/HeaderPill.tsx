'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const HEADER_PILL_SLOT = 'page-pill-slot';

/**
 * Renders into the header from wherever the page happens to be. Going through a
 * portal instead of shared state keeps the pill live: a status that changes
 * mid-page changes in the header too.
 */
export function HeaderPill({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(HEADER_PILL_SLOT));
  }, []);
  if (!slot) return null;
  return createPortal(children, slot);
}
