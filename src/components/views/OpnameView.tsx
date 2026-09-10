'use client';

import { useRouter } from 'next/navigation';
import { HeaderPill } from '@/components/platform/HeaderPill';
import { Logo } from '@/components/platform/Logo';
import { usePageHeader } from '@/components/platform/AppContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { fmtNum } from '@/lib/format';
import type { OpnameRecord, OpnameRow } from '@/lib/opname/record';
import { isFilled, visible } from '@/lib/opname/record';
import type { Answer, Field, Section, Values } from '@/lib/opname/schema';
import { SECTIONS } from '@/lib/opname/schema';
import type { Property } from '@/lib/types';
import { printDoc } from './BerekeningView';

function label(field: Field, value: Answer): string {
  if (!isFilled(value)) return '-';
  if (field.type === 'choice') {
    const opt = (field.options ?? []).find((o) => o.value === value);
    return opt ? opt.label : String(value);
  }
  if (field.type === 'number') return `${fmtNum(Number(value), Number.isInteger(value) ? 0 : 2)}${field.unit ? ` ${field.unit}` : ''}`;
  return String(value);
}

function FormSectionBlock({ section, values }: { section: Section & { kind: 'form' }; values: Values }) {
  const shown = section.fields.filter((f) => visible(f.when, values) && isFilled(values[f.id]));
  if (!shown.length) return null;
  return (
    <div className="report-section">
      <h3>{section.title}</h3>
      <table className="room-table">
        <tbody>
          {shown.map((f) => (
            <tr key={f.id}>
              <td style={{ width: '52%' }}>{f.label}</td>
              <td>{label(f, values[f.id] ?? null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableSectionBlock({
  section,
  rows,
}: {
  section: Section & { kind: 'table' };
  rows: OpnameRow[];
}) {
  if (!rows.length) return null;
  return (
    <div className="report-section">
      <h3>{section.title}</h3>
      <table className="room-table">
        <thead>
          <tr>
            {section.columns.map((c) => (
              <th key={c.id}>
                {c.label}
                {c.unit ? ` (${c.unit})` : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowId}>
              {section.columns.map((c) => (
                <td key={c.id}>{label(c, row[c.id] ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OpnameView({ p }: { p: Property }) {
  const router = useRouter();
  usePageHeader(p.address, `Opnameformulier · ${p.city}`);
  const record = p.opname as OpnameRecord | null | undefined;

  return (
    <>
      <HeaderPill>
        <StatusPill p={p} />
      </HeaderPill>
      <div className="report-toolbar no-print">
        <button className="ghost-btn" onClick={() => router.push(`/panden/${p.id}`)}>
          ← Terug naar pand
        </button>
        <button className="primary-btn" disabled={!record} onClick={() => printDoc(p, 'Opnameformulier NTA 8800')}>
          Download als PDF
        </button>
      </div>
      <div className="report-doc">
        <div className="report-head">
          <div className="report-logo">
            <Logo height={36} />
          </div>
          <div className="report-head-text">
            <div className="report-doc-title">Opnameformulier NTA 8800, woningen</div>
            <div className="report-doc-sub">
              {p.address}, {p.city}
            </div>
          </div>
        </div>

        {!record ? (
          <div className="report-section">
            <h3>Nog geen opname</h3>
            <p>
              Voor dit pand is nog geen opnameformulier ingevuld. Het formulier wordt gevuld tijdens de opname op de
              telefoon en komt hier te staan zodra de opname is verstuurd.
            </p>
          </div>
        ) : (
          <>
            <div className="report-meta">
              <div>
                <span className="l">Formulier</span>
                <span className="v">ISSO 82.1</span>
              </div>
              <div>
                <span className="l">Niveau opname</span>
                <span className="v">{record.values.niveau === 'detail' ? 'Detailopname' : 'Basisopname'}</span>
              </div>
              <div>
                <span className="l">Bouwjaar</span>
                <span className="v">{isFilled(record.values.bouwjaar) ? String(record.values.bouwjaar) : '-'}</span>
              </div>
              <div>
                <span className="l">Laatst bijgewerkt</span>
                <span className="v">{new Date(record.updatedAt).toLocaleDateString('nl-NL')}</span>
              </div>
            </div>

            {SECTIONS.map((s) =>
              s.kind === 'form' ? (
                <FormSectionBlock key={s.id} section={s} values={record.values} />
              ) : (
                <TableSectionBlock key={s.id} section={s} rows={record.rows[s.id] ?? []} />
              ),
            )}

            <div className="report-section">
              <h3>Bewijslast</h3>
              <table className="room-table">
                <thead>
                  <tr>
                    <th>Onderdeel</th>
                    <th>Foto&apos;s</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTIONS.flatMap((s) =>
                    (s.photos ?? [])
                      .filter((req) => visible(req.when, record.values))
                      .map((req) => (
                        <tr key={req.key}>
                          <td>{req.label}</td>
                          <td>{(record.photos[req.key] ?? []).length}</td>
                        </tr>
                      )),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
