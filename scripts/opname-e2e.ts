/**
 * End to end over the capture chain: open a session, sync a measured room,
 * try to close it with an incomplete opnameformulier, fill the form from the
 * schema and close it for real.
 */
import { SECTIONS, type Field, type Section } from '../src/lib/opname/schema';
import { autofill, emptyRecord, gapsFor, type OpnameRecord, type OpnameRow } from '../src/lib/opname/record';
import type { CaptureRoom, Property } from '../src/lib/types';

const BASE = 'http://localhost:3000';

function firstAnswer(f: Field): string | number {
  if (f.type === 'choice') return f.options![0]!.value;
  if (f.type === 'number') return 12;
  return f.label;
}

/** Fill every visible required field, re-running until nothing new opens up. */
function fillEverything(record: OpnameRecord): OpnameRecord {
  let cur = record;
  for (let pass = 0; pass < 8; pass++) {
    const before = JSON.stringify(cur);
    const values = { ...cur.values };
    const rows: Record<string, OpnameRow[]> = { ...cur.rows };
    const photos: Record<string, string[]> = { ...cur.photos };
    for (const section of SECTIONS as Section[]) {
      if (section.kind === 'form') {
        for (const f of section.fields) {
          if (f.optional) continue;
          if (f.when?.some((c) => (c.in ? !c.in.includes(String(values[c.field])) : c.notIn ? c.notIn.includes(String(values[c.field])) : false))) continue;
          if (values[f.id] === undefined || values[f.id] === null) values[f.id] = firstAnswer(f);
        }
      } else {
        const list = [...(rows[section.id] ?? [])];
        while (list.length < section.minRows) list.push({ rowId: `row-${section.id}-${list.length}` });
        rows[section.id] = list.map((row) => {
          const next: OpnameRow = { ...row };
          for (const c of section.columns) {
            if (c.optional) continue;
            if (next[c.id] === undefined || next[c.id] === null) next[c.id] = firstAnswer(c);
          }
          return next;
        });
      }
      for (const req of section.photos ?? []) {
        const visible = !req.when?.some((c) => (c.in ? !c.in.includes(String(values[c.field])) : false));
        if (!visible) continue;
        const have = photos[req.key] ?? [];
        while (have.length < req.min) have.push(`photo-${req.key}-${have.length}`);
        photos[req.key] = have;
      }
    }
    cur = { ...cur, values, rows, photos, updatedAt: new Date().toISOString() };
    if (JSON.stringify(cur) === before) break;
  }
  return cur;
}

async function main() {
  const props = (await (await fetch(`${BASE}/api/property`)).json().catch(() => null)) as unknown;
  void props;

  const create = await fetch(`${BASE}/api/capture`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ propertyId: 'skoallestrjitte', createdBy: 'ruben' }),
  });
  const session = (await create.json()) as { token?: string; error?: string };
  if (!session.token) throw new Error(`sessie aanmaken mislukt: ${JSON.stringify(session)}`);
  const token = session.token;
  console.log('sessie', token);

  const read = await (await fetch(`${BASE}/api/capture/${token}`)).json() as { property: Property | null };

  const rooms: CaptureRoom[] = [
    {
      clientId: 'r1', name: 'Woonkamer', floorName: 'Begane grond', method: 'camera',
      poly: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 5 }, { x: 0, y: 5 }],
      height: 2.6, heading: 90, photoIds: [],
      openings: [
        { wall: 0, offset: 1, width: 1.8, kind: 'raam' },
        { wall: 2, offset: 1, width: 0.9, kind: 'deur' },
      ],
    },
    {
      clientId: 'r2', name: 'Keuken', floorName: 'Begane grond', method: 'camera',
      poly: [{ x: 4, y: 0 }, { x: 7, y: 0 }, { x: 7, y: 5 }, { x: 4, y: 5 }],
      height: 2.6, heading: 90, photoIds: [],
      openings: [{ wall: 0, offset: 0.5, width: 1.2, kind: 'raam' }],
    },
  ];

  const filled = autofill(emptyRecord(), rooms, read.property);
  console.log('autofill:', filled.notes.map((n) => `${n.field}: ${n.note}`).join('\n          '));
  console.log('gevelregels:', JSON.stringify(filled.record.rows.gevels, null, 0));
  console.log('raamregels:', (filled.record.rows.ramen ?? []).length, 'deurregels:', (filled.record.rows.deuren ?? []).length);
  console.log('open punten na autofill:', gapsFor(filled.record).length);

  await fetch(`${BASE}/api/capture/${token}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rooms, opname: filled.record, status: 'capturing' }),
  });

  const tooEarly = await fetch(`${BASE}/api/capture/${token}/finish`, { method: 'POST' });
  const early = await tooEarly.json() as { error?: string };
  console.log('versturen met open punten →', tooEarly.status, early.error);
  if (tooEarly.status !== 400) throw new Error('onvolledige opname had geweigerd moeten worden');

  const complete = fillEverything(filled.record);
  const remaining = gapsFor(complete);
  console.log('open punten na volledig invullen:', remaining.length);
  if (remaining.length) {
    console.log(remaining.slice(0, 10));
    throw new Error('formulier is niet af te maken');
  }

  await fetch(`${BASE}/api/capture/${token}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rooms, opname: complete, status: 'uploaded' }),
  });
  const done = await fetch(`${BASE}/api/capture/${token}/finish`, { method: 'POST' });
  const result = await done.json() as { totalArea?: number; warnings?: string[]; error?: string };
  console.log('versturen →', done.status, JSON.stringify(result));
  if (!done.ok) throw new Error('verzenden mislukt');

  const { envelopeFor, installatiesFor } = await import('../src/lib/nta8800');
  const prop = (await (await fetch(`${BASE}/api/capture/${token}`)).json()) as { property: Property };
  const env = envelopeFor(prop.property);
  console.log('bouwschil uit de opname:');
  for (const e of env.elements) console.log(` ${e.naam}: ${e.opp} m², ${e.eenheid} ${e.waarde} (${e.bron})`);
  console.log('installaties:', JSON.stringify(installatiesFor(prop.property)));
}

void main();
