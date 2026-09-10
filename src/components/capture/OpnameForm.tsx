'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { queuePhoto } from '@/lib/capture/local-store';
import type { OpnameRecord, OpnameRow } from '@/lib/opname/record';
import { fieldVisible, gapsFor, isFilled, photoRequired, progressBySection, visible } from '@/lib/opname/record';
import type { Answer, Field, PhotoReq, Section, Values } from '@/lib/opname/schema';
import { SECTIONS } from '@/lib/opname/schema';

export interface OpnamePhotoPreview {
  id: string;
  url: string;
}

export function OpnameForm({
  token,
  record,
  onChange,
  onClose,
  previews,
  onPreview,
}: {
  token: string;
  record: OpnameRecord;
  onChange: (next: OpnameRecord) => void;
  onClose: () => void;
  previews: Record<string, OpnamePhotoPreview[]>;
  onPreview: (key: string, photos: OpnamePhotoPreview[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const progress = useMemo(() => progressBySection(record), [record]);
  const openTotal = progress.reduce((s, p) => s + p.open, 0);

  const setValue = (id: string, v: Answer) => {
    onChange({ ...record, values: { ...record.values, [id]: v }, updatedAt: new Date().toISOString() });
  };
  const setRows = (sectionId: string, rows: OpnameRow[]) => {
    onChange({ ...record, rows: { ...record.rows, [sectionId]: rows }, updatedAt: new Date().toISOString() });
  };
  const addPhotos = (key: string, ids: string[]) => {
    onChange({
      ...record,
      photos: { ...record.photos, [key]: [...(record.photos[key] ?? []), ...ids] },
      updatedAt: new Date().toISOString(),
    });
  };

  if (open === null) {
    return (
      <div className="cap-panel">
        <div className="cap-panel-title">Opnameformulier</div>
        <p className="cap-help">
          De velden van het opnameformulier NTA 8800 voor woningen, ISSO 82.1. Wat de scan al heeft gemeten staat
          ingevuld; de rest neem je in de woning waar.
        </p>
        <ul className="cap-sections">
          {SECTIONS.map((s) => {
            const p = progress.find((x) => x.id === s.id)!;
            return (
              <li key={s.id}>
                <button className="cap-section-row" onClick={() => setOpen(s.id)}>
                  <span className="cap-section-name">{s.title}</span>
                  <span className={`cap-section-count${p.open === 0 ? ' done' : ''}`}>
                    {p.open === 0 ? 'compleet' : `${p.open} open`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className={`cap-note${openTotal ? ' warn' : ''}`}>
          {openTotal === 0
            ? 'Het opnameformulier is compleet.'
            : `Nog ${openTotal} punt${openTotal === 1 ? '' : 'en'} open voordat de opname verstuurd kan worden.`}
        </div>
        <div className="cap-actions">
          <button className="cap-btn ghost" onClick={onClose}>
            Terug
          </button>
        </div>
      </div>
    );
  }

  const section = SECTIONS.find((s) => s.id === open)!;
  return (
    <SectionPanel
      token={token}
      section={section}
      values={record.values}
      rows={record.rows[section.id] ?? []}
      photoIds={record.photos}
      previews={previews}
      onValue={setValue}
      onRows={(rows) => setRows(section.id, rows)}
      onPhoto={(key, added) => {
        addPhotos(key, added.map((p) => p.id));
        onPreview(key, added);
      }}
      onBack={() => setOpen(null)}
      gaps={gapsFor(record).filter((g) => g.sectionId === section.id).length}
    />
  );
}

function SectionPanel({
  token,
  section,
  values,
  rows,
  photoIds,
  previews,
  onValue,
  onRows,
  onPhoto,
  onBack,
  gaps,
}: {
  token: string;
  section: Section;
  values: Values;
  rows: OpnameRow[];
  photoIds: Record<string, string[]>;
  previews: Record<string, OpnamePhotoPreview[]>;
  onValue: (id: string, v: Answer) => void;
  onRows: (rows: OpnameRow[]) => void;
  onPhoto: (key: string, photos: OpnamePhotoPreview[]) => void;
  onBack: () => void;
  gaps: number;
}) {
  return (
    <div className="cap-panel">
      <div className="cap-panel-title">{section.title}</div>
      {section.intro && <p className="cap-help">{section.intro}</p>}

      {section.kind === 'form' &&
        section.fields
          .filter((f) => fieldVisible(f, values))
          .map((f) => (
            <FieldInput key={f.id} field={f} value={values[f.id] ?? null} onChange={(v) => onValue(f.id, v)} />
          ))}

      {section.kind === 'table' && (
        <>
          {rows.length === 0 && <p className="cap-help">Nog geen regels.</p>}
          {rows.map((row, i) => (
            <div className="cap-row-card" key={row.rowId}>
              <div className="cap-row-head">
                <strong>{typeof row.naam === 'string' && row.naam ? row.naam : `Regel ${i + 1}`}</strong>
                <button
                  className="cap-linkbtn"
                  onClick={() => onRows(rows.filter((r) => r.rowId !== row.rowId))}
                >
                  verwijder
                </button>
              </div>
              {section.columns
                .filter((c) => visible(c.when, row as Values))
                .map((c) => (
                  <FieldInput
                    key={c.id}
                    field={c}
                    value={row[c.id] ?? null}
                    onChange={(v) =>
                      onRows(rows.map((r) => (r.rowId === row.rowId ? { ...r, [c.id]: v } : r)))
                    }
                  />
                ))}
            </div>
          ))}
          <button
            className="cap-btn ghost"
            onClick={() => {
              const blank: OpnameRow = { rowId: crypto.randomUUID() };
              for (const c of section.columns) blank[c.id] = null;
              onRows([...rows, blank]);
            }}
          >
            Regel toevoegen
          </button>
        </>
      )}

      {(section.photos ?? [])
        .filter((p) => photoRequired(p, values))
        .map((p) => (
          <PhotoSlot
            key={p.key}
            token={token}
            req={p}
            have={(photoIds[p.key] ?? []).length}
            previews={previews[p.key] ?? []}
            onPhoto={(added) => onPhoto(p.key, added)}
          />
        ))}

      <div className={`cap-note${gaps ? ' warn' : ''}`}>
        {gaps === 0 ? 'Dit onderdeel is compleet.' : `${gaps} punt${gaps === 1 ? '' : 'en'} nog open.`}
      </div>
      <div className="cap-actions">
        <button className="cap-btn" onClick={onBack}>
          Klaar met dit onderdeel
        </button>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: Answer;
  onChange: (v: Answer) => void;
}) {
  const missing = !field.optional && !isFilled(value);
  return (
    <label className={`cap-field${missing ? ' missing' : ''}`}>
      <span>
        {field.label}
        {field.unit ? ` (${field.unit})` : ''}
        {field.optional ? ' — optioneel' : ''}
      </span>
      {field.type === 'choice' ? (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Kies…</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'number' ? (
        <NumberInput value={value} onChange={onChange} />
      ) : (
        <input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}
      {field.hint && <em className="cap-field-hint">{field.hint}</em>}
    </label>
  );
}

/**
 * A number field that keeps what was typed. Rendering the parsed number back
 * into the box would swallow the decimal separator halfway through "0,5".
 */
function NumberInput({ value, onChange }: { value: Answer; onChange: (v: Answer) => void }) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value));
  const last = useRef(value);
  if (last.current !== value) {
    last.current = value;
    const shown = value === null || value === undefined ? '' : String(value);
    if (Number(text.replace(',', '.')) !== value && text !== shown) setText(shown);
  }
  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const cleaned = raw.replace(',', '.').trim();
        if (cleaned === '') onChange(null);
        else if (/^-?\d+(\.\d+)?$/.test(cleaned)) onChange(Number(cleaned));
      }}
      onBlur={() => {
        const cleaned = text.replace(',', '.').trim();
        if (cleaned !== '' && !/^-?\d+(\.\d+)?$/.test(cleaned)) {
          setText('');
          onChange(null);
        }
      }}
    />
  );
}

function PhotoSlot({
  token,
  req,
  have,
  previews,
  onPhoto,
}: {
  token: string;
  req: PhotoReq;
  have: number;
  previews: OpnamePhotoPreview[];
  onPhoto: (photos: OpnamePhotoPreview[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);

  // Alle foto's uit één keuze gaan in één keer mee: los toevoegen zou telkens
  // van hetzelfde oude record uitgaan en alleen de laatste bewaren.
  const handle = async (files: FileList | null) => {
    if (!files) return;
    const added: OpnamePhotoPreview[] = [];
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const bitmap = await createImageBitmap(file).catch(() => null);
      const queued = await queuePhoto({
        id,
        token,
        roomClientId: null,
        kind: 'detail',
        opnameKey: req.key,
        blob: file,
        width: bitmap?.width ?? 0,
        height: bitmap?.height ?? 0,
      });
      bitmap?.close();
      if (!queued) {
        setFailed(true);
        continue;
      }
      added.push({ id, url: URL.createObjectURL(file) });
    }
    if (added.length) onPhoto(added);
  };

  const short = have < req.min;
  return (
    <div className={`cap-photo-req${short ? ' missing' : ''}`}>
      <div className="cap-photo-req-head">
        <span>{req.label}</span>
        <span className="cap-photo-req-count">
          {have}/{req.min}
        </span>
      </div>
      {req.hint && <em className="cap-field-hint">{req.hint}</em>}
      <button className="cap-btn ghost" onClick={() => inputRef.current?.click()}>
        Foto maken
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => void handle(e.target.files)}
      />
      {failed && (
        <div className="cap-note warn">
          De foto kon niet lokaal worden bewaard. Zet opslag voor deze site aan en maak hem opnieuw.
        </div>
      )}
      {previews.length > 0 && (
        <div className="cap-photo-grid">
          {previews.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt={req.label} />
          ))}
        </div>
      )}
    </div>
  );
}
