'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Rendered into the body, and it swallows its own clicks. React events travel
 * the component tree rather than the DOM tree, so a portal alone would still let
 * a click inside the modal reach the table row the modal was opened from.
 */
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`modal-overlay${open ? ' show' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Sluiten">
          ✕
        </button>
        <div>{open ? children : null}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return <div className="modal-title">{children}</div>;
}

export function ModalSub({ children }: { children: ReactNode }) {
  return <div className="modal-sub">{children}</div>;
}
