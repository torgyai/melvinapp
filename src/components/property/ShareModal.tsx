'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/components/platform/AppContext';
import { Modal, ModalSub, ModalTitle } from '@/components/ui/Modal';
import type { Property } from '@/lib/types';

function openClientLink(link: string) {
  // Sommige omgevingen (zoals een ingesloten preview-venster) blokkeren pop-ups;
  // val in dat geval terug op navigeren in hetzelfde tabblad.
  let w: Window | null = null;
  try {
    w = window.open(link, '_blank');
  } catch {
    w = null;
  }
  if (!w || w.closed) window.location.href = link;
}

function LinkRow({ link }: { link: string }) {
  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => undefined);
  };
  return (
    <div className="share-link-row">
      <input type="text" readOnly value={link} onClick={(e) => e.currentTarget.select()} />
      <button className="ghost-btn" onClick={copy}>
        Kopieer
      </button>
    </div>
  );
}

export function ShareModal({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const { properties } = useApp();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/klant/${p.id}`;
  const portfolioLink = p.ownerId ? `${origin}/klant/portfolio/${p.ownerId}` : null;
  const group = p.ownerId ? properties.filter((x) => x.ownerId === p.ownerId) : [];

  return (
    <Modal open={open} onClose={onClose}>
      <ModalTitle>Deel met klant</ModalTitle>
      <ModalSub>
        {p.address}, {p.city}
      </ModalSub>
      <div>Deze link geeft de huiseigenaar een eenvoudige voortgangspagina te zien, zonder toegang tot het platform.</div>
      <LinkRow link={link} />
      <div style={{ marginTop: 16 }}>
        <button className="primary-btn" onClick={() => openClientLink(link)}>
          Open klantweergave
        </button>
      </div>
      {portfolioLink && (
        <>
          <div className="modal-divider" />
          <div className="modal-sub" style={{ marginBottom: 8 }}>
            {p.ownerName} heeft {group.length} panden bij Krik je energielabel op. Deel eventueel één portfoliolink voor
            alle panden samen:
          </div>
          <LinkRow link={portfolioLink} />
          <div style={{ marginTop: 10 }}>
            <button className="ghost-btn" onClick={() => openClientLink(portfolioLink)}>
              Open portfolioweergave
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
