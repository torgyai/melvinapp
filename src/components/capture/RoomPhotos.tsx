'use client';

import { useEffect, useRef, useState } from 'react';
import { queuePhoto } from '@/lib/capture/local-store';

export interface PendingPhoto {
  id: string;
  url: string;
  kind: string;
}

const KINDS = [
  { key: 'ruimte', label: 'Ruimte' },
  { key: 'voorgevel', label: 'Voorgevel' },
  { key: 'installatie', label: 'CV of warmtepomp' },
  { key: 'meterkast', label: 'Meterkast' },
  { key: 'detail', label: 'Detail' },
];

/**
 * Foto's gaan direct de uploadwachtrij in. Lukt versturen niet, dan blijven ze
 * in IndexedDB staan tot de telefoon weer bereik heeft.
 */
export function RoomPhotos({
  token,
  roomClientId,
  photos,
  onAdd,
}: {
  token: string;
  roomClientId: string | null;
  photos: PendingPhoto[];
  onAdd: (p: PendingPhoto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState('ruimte');
  const [failed, setFailed] = useState(0);
  const urls = useRef<string[]>([]);

  // Camera blobs are large; a long opname would otherwise hold every one of them
  // for the life of the tab.
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const bitmap = await createImageBitmap(file).catch(() => null);
      const queued = await queuePhoto({
        id,
        token,
        roomClientId,
        kind,
        blob: file,
        width: bitmap?.width ?? 0,
        height: bitmap?.height ?? 0,
      });
      bitmap?.close();
      if (!queued) {
        setFailed((n) => n + 1);
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      onAdd({ id, url, kind });
    }
  };

  return (
    <div className="cap-photos">
      <div className="cap-photo-kinds">
        {KINDS.map((k) => (
          <button key={k.key} className={`cap-chip${kind === k.key ? ' active' : ''}`} onClick={() => setKind(k.key)}>
            {k.label}
          </button>
        ))}
      </div>
      <button className="cap-btn ghost" onClick={() => inputRef.current?.click()}>
        📷 Foto maken
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {failed > 0 && (
        <div className="cap-note warn">
          {failed} foto{failed === 1 ? '' : "'s"} kon niet lokaal worden bewaard. Zet opslag voor deze site aan, of maak de
          foto opnieuw zodra je bereik hebt.
        </div>
      )}
      {photos.length > 0 && (
        <div className="cap-photo-grid">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt={p.kind} />
          ))}
        </div>
      )}
    </div>
  );
}
