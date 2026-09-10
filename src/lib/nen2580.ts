import { NEN_REAL, type NenFloorRow, type NenRow } from '@/data/properties';
import { round1 } from './format';
import type { Property } from './types';

export type NenCategory = 'gow' | 'gooir' | 'gogbr' | 'goeb';

export const NEN_BEGRIPPEN: { code: string; text: string }[] = [
  { code: 'GOW', text: 'Gebruiksoppervlakte wonen: het oppervlak van de ruimtes die als woonruimte gelden.' },
  { code: 'GOOIR', text: 'Gebruiksoppervlakte overige inpandige ruimte: inpandige ruimte die niet als woonruimte telt, zoals een garage.' },
  { code: 'GOGBR', text: 'Gebruiksoppervlakte gebouwgebonden buitenruimte: buitenruimte die vast aan het gebouw zit, zoals een overkapping, balkon of terras.' },
  { code: 'GOEB', text: 'Gebruiksoppervlakte externe bergruimte: losstaande bergruimte buiten de woning, zoals een schuur.' },
  { code: 'OR', text: 'Ontoegankelijke ruimte: ruimte met beperkte stahoogte (< 1,50 m), niet meegeteld in het gebruiksoppervlak.' },
  { code: 'VIDE', text: 'Het open gedeelte van een trapgat groter dan 4 m², niet meegeteld in het gebruiksoppervlak.' },
  { code: 'BI', text: 'Bruto-inhoud: de totale inhoud van het gebouw, gemeten tot aan de buitenkant van de buitenmuren.' },
];

export function nenCategoryFor(roomName: string, wholeFloorIsStorage: boolean): NenCategory {
  if (/garage/i.test(roomName)) return 'gooir';
  if (/overkapping|balkon|terras|loggia/i.test(roomName)) return 'gogbr';
  if (/^berging$|schuur/i.test(roomName)) return wholeFloorIsStorage ? 'goeb' : 'gooir';
  return 'gow';
}

export interface NenBreakdown {
  floors: NenFloorRow[];
  totals: NenRow;
  /** True when the split comes from a real measurement report rather than room names. */
  official: boolean;
}

export function nenBreakdown(p: Property): NenBreakdown {
  const real = NEN_REAL[p.id];
  if (real) return { ...real, official: true };

  const totalRoomArea =
    p.floors.reduce((s, f) => s + f.rooms.reduce((s2, r) => s2 + r.area, 0), 0) || 1;
  const knownBI = p.meetrapport?.bi;

  const floors: NenFloorRow[] = p.floors.map((f) => {
    const row: NenFloorRow = { name: f.name, or: 0, vide: 0, gow: 0, gooir: 0, gogbr: 0, goeb: 0, bi: 0, biExt: 0 };
    const wholeFloorIsStorage = f.rooms.every((r) => /^berging$|schuur/i.test(r.name));
    f.rooms.forEach((r) => {
      const cat = nenCategoryFor(r.name, wholeFloorIsStorage);
      row[cat] = round1(row[cat] + r.area);
    });
    const area = f.rooms.reduce((s, r) => s + r.area, 0);
    // Bruto-inhoud: uit het meetrapport wanneer dat er is, anders uit de hoogtes
    // die tijdens de opname zijn gemeten, en pas als laatste uit een aanname.
    const measured = f.rooms.every((r) => typeof r.height === 'number' && r.height > 0)
      ? f.rooms.reduce((s, r) => s + r.area * (r.height as number), 0)
      : null;
    row.bi = knownBI
      ? Math.round(knownBI * (area / totalRoomArea))
      : measured !== null
        ? Math.round(measured)
        : Math.round(area * 2.6);
    return row;
  });

  const totals = floors.reduce<NenRow>(
    (t, f) => ({
      or: round1(t.or + f.or), vide: round1(t.vide + f.vide), gow: round1(t.gow + f.gow),
      gooir: round1(t.gooir + f.gooir), gogbr: round1(t.gogbr + f.gogbr), goeb: round1(t.goeb + f.goeb),
      bi: t.bi + f.bi, biExt: t.biExt + f.biExt,
    }),
    { or: 0, vide: 0, gow: 0, gooir: 0, gogbr: 0, goeb: 0, bi: 0, biExt: 0 },
  );

  return { floors, totals, official: false };
}

export type { NenFloorRow, NenRow };
