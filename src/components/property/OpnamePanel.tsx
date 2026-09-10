'use client';

import { useRouter } from 'next/navigation';
import type { OpnameRecord } from '@/lib/opname/record';
import { gapsFor } from '@/lib/opname/record';
import { SECTIONS } from '@/lib/opname/schema';
import type { Property } from '@/lib/types';

/**
 * What the field opname recorded, and whether it is complete enough to register
 * the label. The full form is one click away.
 */
export function OpnamePanel({ p }: { p: Property }) {
  const router = useRouter();
  const record = p.opname as OpnameRecord | null | undefined;

  if (!record) {
    return (
      <div className="panel" style={{ marginTop: 18 }}>
        <h3>Opnameformulier NTA 8800</h3>
        <p className="muted">
          Nog geen opname. Het formulier wordt tijdens de opname op de telefoon ingevuld en verschijnt hier zodra de
          opname is verstuurd.
        </p>
      </div>
    );
  }

  const gaps = gapsFor(record);
  const filledSections = SECTIONS.filter(
    (s) =>
      (s.kind === 'form' && s.fields.some((f) => record.values[f.id] !== undefined && record.values[f.id] !== null)) ||
      (s.kind === 'table' && (record.rows[s.id] ?? []).length > 0),
  ).length;
  const fotos = Object.values(record.photos).reduce((n, list) => n + list.length, 0);

  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <h3>Opnameformulier NTA 8800</h3>
      <div className="label-fact">
        <div className="f">
          <div className="v">{record.values.niveau === 'detail' ? 'Detail' : 'Basis'}</div>
          <div className="l">niveau opname</div>
        </div>
        <div className="f">
          <div className="v">
            {filledSections}/{SECTIONS.length}
          </div>
          <div className="l">onderdelen ingevuld</div>
        </div>
        <div className="f">
          <div className="v">{fotos}</div>
          <div className="l">bewijsfoto&apos;s</div>
        </div>
        <div className="f">
          <div className="v">{gaps.length === 0 ? 'compleet' : gaps.length}</div>
          <div className="l">{gaps.length === 0 ? 'gereed voor afmelding' : 'punten open'}</div>
        </div>
      </div>
      <button className="linkbtn" onClick={() => router.push(`/panden/${p.id}/opname`)}>
        Bekijk het opnameformulier
      </button>
    </div>
  );
}
