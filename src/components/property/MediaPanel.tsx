'use client';

import { useState } from 'react';
import { Modal, ModalSub, ModalTitle } from '@/components/ui/Modal';
import type { Property } from '@/lib/types';

const PLACEHOLDER_INK = { color: 'var(--ink-soft)', textShadow: 'none' };

function roomNames(p: Property): string[] {
  return p.floors.flatMap((f) => f.rooms.map((r) => r.name));
}

export function MediaFacts({ p }: { p: Property }) {
  return (
    <div className="label-fact">
      <div className="f">
        <div className="v">{p.photoCount}</div>
        <div className="l">afgewerkte foto&apos;s</div>
      </div>
      <div className="f">
        <div className="v">–</div>
        <div className="l">ruwe opnames</div>
      </div>
      <div className="f">
        <div className="v">–</div>
        <div className="l">video</div>
      </div>
    </div>
  );
}

export function MediaThumbs({ p, onOpenVideo }: { p: Property; onOpenVideo?: () => void }) {
  const names = p.photoCount > 0 ? roomNames(p).slice(0, 4) : [];
  return (
    <div className="media-thumbs">
      {names.map((name, i) => (
        <div className="media-thumb" key={`${name}-${i}`} style={PLACEHOLDER_INK}>
          <div>{name}</div>
        </div>
      ))}
      <div className="media-thumb video" style={PLACEHOLDER_INK} onClick={onOpenVideo}>
        <div className="play-ic">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div>Video</div>
      </div>
    </div>
  );
}

export function MediaPanel({ p }: { p: Property }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <h3>Foto&apos;s &amp; video</h3>
      <MediaFacts p={p} />
      <MediaThumbs p={p} onOpenVideo={() => setMediaOpen(true)} />
      <div className="media-note">
        Automatisch afgewerkt in de huisstijl: lichtcorrectie, kleurcorrectie en het verwijderen van storende objecten.
        Gebeurt bij elke opname, los van welke output hierboven is gekozen. De beelden zelf zijn nog niet aan dit pand
        gekoppeld: zodra een opname is aangeleverd, verschijnen ze op deze plek.
      </div>
      <button className="linkbtn" onClick={() => setMediaOpen(true)}>
        Bekijk fotoset &amp; video
      </button>
      <MediaModal
        p={p}
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onOpenPhotos={() => {
          setMediaOpen(false);
          setPhotosOpen(true);
        }}
      />
      <PhotosModal p={p} open={photosOpen} onClose={() => setPhotosOpen(false)} />
    </div>
  );
}

function MediaModal({
  p,
  open,
  onClose,
  onOpenPhotos,
}: {
  p: Property;
  open: boolean;
  onClose: () => void;
  onOpenPhotos: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalTitle>Foto&apos;s &amp; video</ModalTitle>
      <ModalSub>
        {p.address}, {p.city} · afgewerkt in huisstijl
      </ModalSub>
      <div className="ba-wrap">
        <div className="ba-tile voor" style={PLACEHOLDER_INK}>
          <div>Voor bewerking</div>
          <div className="sub">ruwe opname</div>
        </div>
        <div className="ba-tile na" style={PLACEHOLDER_INK}>
          <div>Na bewerking</div>
          <div className="sub">huisstijl, gecorrigeerd</div>
        </div>
      </div>
      <ul className="media-edit-list">
        <li>Lichtcorrectie en witbalans toegepast op de hele set</li>
        <li>Storende objecten (kabels, vuilnisbakken, weerspiegelingen) verwijderd</li>
        <li>Kleurprofiel en uitsnede volgens de huisstijl van Krik je energielabel op</li>
        <li>Dronebeelden en rondleiding gemonteerd tot één video</li>
      </ul>
      <div className="media-note">
        Dit gebeurt automatisch bij elke opname, ongeacht of alleen de plattegrond, alleen het energielabel, of beide
        worden afgenomen. Voor dit pand zijn {p.photoCount} afgewerkte foto&apos;s geregistreerd; de beelden zelf zijn nog
        niet aan het platform gekoppeld.
      </div>
      {p.photoCount > 0 && (
        <button className="linkbtn" style={{ marginTop: 12 }} onClick={onOpenPhotos}>
          Bekijk volledige fotoset ({p.photoCount})
        </button>
      )}
    </Modal>
  );
}

export function PhotosModal({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const names = roomNames(p);
  const tiles = names.length ? names.slice(0, 16) : [];
  return (
    <Modal open={open} onClose={onClose}>
      <ModalTitle>Foto&apos;s</ModalTitle>
      <ModalSub>
        {p.address}, {p.city} · {p.photoCount} afgewerkte beelden · beelden nog niet gekoppeld aan het platform
      </ModalSub>
      <div className="photo-grid">
        {tiles.map((name, i) => (
          <div className="photo-tile" key={`${name}-${i}`}>
            <span className="photo-tile-label">{name}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
