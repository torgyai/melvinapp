import type { CaptureRoom, Property } from '@/lib/types';
import { floorsFromRooms, gevelsPerOrientatie, openingsPerOrientatie, orientatieLabel } from './footprint';
import type { Answer, Cond, Field, PhotoReq, Section, Values } from './schema';
import { SECTIONS } from './schema';

export const FORMULIER = 'Opnameformulier NTA 8800 Woningen, ISSO 82.1';

export type OpnameRow = Record<string, Answer> & { rowId: string };

export interface OpnameRecord {
  formulier: string;
  values: Values;
  rows: Record<string, OpnameRow[]>;
  /** Photo ids per bewijslast-key. */
  photos: Record<string, string[]>;
  /**
   * Tables the scan has already filled once. A table that has been seeded is
   * never seeded again, so a row the surveyor deletes stays deleted.
   */
  seeded: string[];
  updatedAt: string;
}

export function emptyRecord(): OpnameRecord {
  return {
    formulier: FORMULIER, values: {}, rows: {}, photos: {}, seeded: [],
    updatedAt: new Date().toISOString(),
  };
}

export function isFilled(v: Answer | undefined): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'number') return Number.isFinite(v);
  return true;
}

function condHolds(c: Cond, values: Values): boolean {
  const v = values[c.field];
  if (c.in) return typeof v === 'string' && c.in.includes(v);
  if (c.notIn) return typeof v === 'string' && !c.notIn.includes(v);
  return isFilled(v);
}

export function visible(when: Cond[] | undefined, values: Values): boolean {
  if (!when?.length) return true;
  return when.every((c) => condHolds(c, values));
}

export function fieldVisible(f: Field, values: Values): boolean {
  return visible(f.when, values);
}

export function photoRequired(p: PhotoReq, values: Values): boolean {
  return visible(p.when, values);
}

export interface Gap {
  sectionId: string;
  section: string;
  what: string;
}

/** Everything a basisopname still needs before it may be sent in. */
export function gapsFor(record: OpnameRecord): Gap[] {
  const gaps: Gap[] = [];
  const values = record.values;
  for (const section of SECTIONS) {
    if (section.kind === 'form') {
      for (const f of section.fields) {
        if (f.optional || !fieldVisible(f, values)) continue;
        if (!isFilled(values[f.id])) gaps.push({ sectionId: section.id, section: section.title, what: f.label });
      }
    } else {
      const rows = record.rows[section.id] ?? [];
      if (rows.length < section.minRows) {
        gaps.push({
          sectionId: section.id,
          section: section.title,
          what: section.minRows === 1 ? 'ten minste één regel' : `ten minste ${section.minRows} regels`,
        });
      }
      rows.forEach((row, i) => {
        for (const col of section.columns) {
          if (col.optional || !visible(col.when, row as Values)) continue;
          if (!isFilled(row[col.id])) {
            const naam = typeof row.naam === 'string' && row.naam ? row.naam : `regel ${i + 1}`;
            gaps.push({ sectionId: section.id, section: section.title, what: `${naam}: ${col.label}` });
          }
        }
      });
    }
    for (const p of section.photos ?? []) {
      if (!photoRequired(p, values)) continue;
      const have = (record.photos[p.key] ?? []).length;
      if (have < p.min) {
        gaps.push({ sectionId: section.id, section: section.title, what: `foto: ${p.label}` });
      }
    }
  }
  return gaps;
}

export function isComplete(record: OpnameRecord): boolean {
  return gapsFor(record).length === 0;
}

export interface SectionProgress {
  id: string;
  title: string;
  open: number;
}

export function progressBySection(record: OpnameRecord): SectionProgress[] {
  const gaps = gapsFor(record);
  return SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    open: gaps.filter((g) => g.sectionId === s.id).length,
  }));
}

/* ---------- what the scan already knows ---------- */

const FLOOR_ORDER = ['Kelder', 'Begane grond', 'Eerste verdieping', 'Tweede verdieping', 'Zolder', 'Berging'];
/** Floors outside the thermische schil, which carry no gebruiksoppervlakte. */
const UNHEATED_FLOORS = ['Berging'];

function floorRank(name: string): number {
  const i = FLOOR_ORDER.indexOf(name);
  return i === -1 ? 99 : i;
}

export interface AutofillNote {
  field: string;
  note: string;
}

export interface Autofilled {
  record: OpnameRecord;
  notes: AutofillNote[];
}

function row(rowId: string, data: Record<string, Answer>): OpnameRow {
  return { rowId, ...data };
}

/**
 * Fill in what the geometry settles, and leave the rest to the surveyor. Nothing
 * here overwrites an answer that is already there, so re-running it after an
 * extra room is measured only adds.
 */
export function autofill(record: OpnameRecord, rooms: CaptureRoom[], property: Property | null): Autofilled {
  const next: OpnameRecord = {
    ...record,
    values: { ...record.values },
    rows: { ...record.rows },
    photos: { ...record.photos },
  };
  const notes: AutofillNote[] = [];
  const seeded = new Set(next.seeded ?? []);
  const seed = (table: string, rows: OpnameRow[], note: string) => {
    if (seeded.has(table)) return;
    seeded.add(table);
    if (!rows.length) return;
    next.rows[table] = rows;
    notes.push({ field: table, note });
  };
  const set = (id: string, v: Answer, note: string) => {
    if (isFilled(next.values[id])) return;
    if (!isFilled(v)) return;
    next.values[id] = v;
    notes.push({ field: id, note });
  };

  const floors = floorsFromRooms(rooms).sort((a, b) => floorRank(a.name) - floorRank(b.name));
  const living = floors.filter((f) => !UNHEATED_FLOORS.includes(f.name));
  const totalArea = Math.round(floors.reduce((s, f) => s + f.area, 0) * 10) / 10;

  set('bouwjaar', property?.year ?? null, 'uit de BAG');
  set('afmelding', 'bestaand', 'standaard voor een bestaande woning');
  set('niveau', 'basis', 'standaard');
  set('rekenzones', 1, 'één woning is één rekenzone');
  set('wooneenheden', 1, 'één woning');
  set('bouwlagen', living.length || null, 'aantal verdiepingen in de opname');

  const hoogte = living.reduce((s, f) => s + f.storeyHeight, 0);
  set('gebouwhoogte', hoogte ? Math.round(hoogte * 10) / 10 : null, 'gemeten hoogtes bij elkaar opgeteld');

  const agFields = ['agBouwlaag1', 'agBouwlaag2', 'agBouwlaag3', 'agBouwlaag4'];
  living.forEach((f, i) => {
    if (i < agFields.length) set(agFields[i]!, f.area, `gemeten oppervlak ${f.name.toLowerCase()}`);
  });
  const rest = living.slice(agFields.length).reduce((s, f) => s + f.area, 0);
  if (rest > 0) set('agOverig', Math.round(rest * 10) / 10, 'gemeten oppervlak van de overige bouwlagen');
  const unheated = floors.filter((f) => UNHEATED_FLOORS.includes(f.name));

  if (property?.type) {
    const t = property.type.toLowerCase();
    const guess =
      t.includes('vrijstaand') ? 'vrijstaand'
      : t.includes('twee-onder') || t.includes('2-onder') ? 'twee-onder-een-kap'
      : t.includes('hoek') ? 'hoekwoning'
      : t.includes('tussen') || t.includes('rij') ? 'tussenwoning'
      : t.includes('appartement') ? 'app-tussen-midden'
      : null;
    if (guess) set('gebouwtype', guess, `afgeleid uit het woningtype "${property.type}"`);
  }

  /* Bouwdelen from the measured outline. */
  const gevels = gevelsPerOrientatie(floors);
  seed(
    'gevels',
    gevels.map((g, i) =>
      row(`gevel-${g.orientatie ?? i}`, {
        naam: g.orientatie ? `Gevel ${orientatieLabel(g.orientatie)}` : `Gevel ${i + 1}`,
        opp: g.netto,
        begrenzing: 'B',
        orientatie: g.orientatie,
        isolatie: null,
        spouwvulling: null,
        dikte: null,
      }),
    ),
    `${gevels.length} gevelvlakken uit de gemeten buitenmuren, glas en deuren er al af`,
  );

  const grond = floors.find((f) => f.name === 'Begane grond') ?? living[0];
  seed(
    'vloeren',
    grond
      ? [
          row('vloer-bg', {
            naam: `Vloer ${grond.name.toLowerCase()}`,
            opp: grond.area,
            begrenzing: 'K',
            perimeter: grond.perimeter || null,
            isolatie: null,
            dikte: null,
            luchtspouw: null,
            thermokussen: null,
          }),
        ]
      : [],
    'oppervlak en perimeter uit de gemeten begane grond',
  );

  const top = living[living.length - 1];
  if (top && isFilled(next.values.typeDak)) {
    const plat = next.values.typeDak === 'plat';
    const twoLongest = gevels.filter((g) => g.orientatie).slice(0, 2);
    const helling = 40;
    const vlak = Math.round(((top.area / 2) / Math.cos((helling * Math.PI) / 180)) * 10) / 10;
    seed(
      'daken',
      plat
        ? [
            row('dak-plat', {
              naam: 'Plat dak', opp: top.area, begrenzing: 'B', hellingshoek: 0, orientatie: 'H',
              isolatie: null, dikte: null, luchtspouw: null,
            }),
          ]
        : (twoLongest.length === 2 ? twoLongest : [{ orientatie: null }, { orientatie: null }]).map((g, i) =>
            row(`dak-${i}`, {
              naam: g.orientatie ? `Dakvlak ${orientatieLabel(g.orientatie)}` : `Dakvlak ${i + 1}`,
              opp: vlak, begrenzing: 'B', hellingshoek: helling, orientatie: g.orientatie ?? null,
              isolatie: null, dikte: null, luchtspouw: null,
            }),
          ),
      'dakvlakken geschat uit het bovenste bouwlaagoppervlak, controleer de helling',
    );
  }

  const openings = openingsPerOrientatie(floors, rooms);
  const ramen = openings.filter((o) => o.kind === 'raam');
  seed(
    'ramen',
    ramen.map((o, i) =>
      row(`raam-${i}`, {
        naam: o.orientatie
          ? `Raam ${o.room.toLowerCase()} ${orientatieLabel(o.orientatie)}`
          : `Raam ${o.room.toLowerCase()} ${i + 1}`,
        opp: o.opp, begrenzing: 'B', orientatie: o.orientatie,
        kozijn: null, glas: null, zonwering: null, belemmering: null,
      }),
    ),
    `${ramen.length} raamopeningen uit de rondscan, breedte gemeten en hoogte geschat`,
  );

  const deuren = openings.filter((o) => o.kind === 'deur');
  seed(
    'deuren',
    deuren.map((o, i) =>
      row(`deur-${i}`, {
        naam: `Buitendeur ${o.room.toLowerCase()}`,
        opp: o.opp, begrenzing: 'B', orientatie: o.orientatie, kozijn: null, deur: null,
      }),
    ),
    `${deuren.length} buitendeuren uit de rondscan`,
  );

  if (totalArea > 0 && !isFilled(next.values.agBouwlaag1)) {
    set('agBouwlaag1', Math.round((totalArea - unheated.reduce((s, f) => s + f.area, 0)) * 10) / 10, 'totaal gemeten oppervlak');
  }

  next.seeded = [...seeded];
  next.updatedAt = new Date().toISOString();
  return { record: next, notes };
}

/**
 * Drop what the scan derived but nobody has touched, so it can be derived again
 * from a changed room list. Rows the surveyor has filled in are left alone.
 */
export function clearDerived(record: OpnameRecord, tables: string[]): OpnameRecord {
  const rows = { ...record.rows };
  const seeded = new Set(record.seeded ?? []);
  for (const table of tables) {
    const list = rows[table] ?? [];
    const untouched = list.every((r) => !isFilled(r.isolatie) && !isFilled(r.glas) && !isFilled(r.deur) && !isFilled(r.kozijn));
    if (!untouched) continue;
    delete rows[table];
    seeded.delete(table);
  }
  return { ...record, rows, seeded: [...seeded], updatedAt: new Date().toISOString() };
}
