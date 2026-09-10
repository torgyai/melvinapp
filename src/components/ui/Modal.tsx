'use client';

import { useEffect, type ReactNode } from 'react';

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      className={`modal-overlay${open ? ' show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Sluiten">
          ✕
        </button>
        <div>{open ? children : null}</div>
      </div>
    </div>
  );
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return <div className="modal-title">{children}</div>;
}

export function ModalSub({ children }: { children: ReactNode }) {
  return <div className="modal-sub">{children}</div>;
}
