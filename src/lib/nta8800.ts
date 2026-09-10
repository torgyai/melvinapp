import { indexToLabel, totalArea } from './domain';
import { round2 } from './format';
import type { LabelKey, Property } from './types';

export interface EnvelopeElement {
  naam: string;
  opp: number;
  eenheid: 'Rc' | 'U';
  waarde: number;
  bron: string;
}

export interface Envelope {
  era: { muur: number; dak: number; vloer: number; glasU: number; label: string };
  elements: EnvelopeElement[];
}

/**
 * Bouwschil op basis van bouwjaar-typering, de forfaitaire route die NTA 8800
 * toestaat wanneer er geen bewijsstukken van de isolatie zijn.
 */
export function envelopeFor(p: Property): Envelope {
  const y = p.year || 1995;
  let era: Envelope['era'];
  if (y < 1975) era = { muur: 0.5, dak: 0.8, vloer: 0.5, glasU: 2.9, label: 'vóór 1975' };
  else if (y < 1992) era = { muur: 1.3, dak: 1.3, vloer: 1.3, glasU: 2.9, label: '1975–1992' };
  else if (y < 2006) era = { muur: 2.0, dak: 2.0, vloer: 2.0, glasU: 1.6, label: '1992–2006' };
  else if (y < 2015) era = { muur: 2.5, dak: 2.5, vloer: 2.5, glasU: 1.2, label: '2006–2015' };
  else era = { muur: 4.5, dak: 6.0, vloer: 3.5, glasU: 1.0, label: '2015 en later' };

  const area = totalArea(p);
  const measuredGlass = measuredGlassArea(p);
  return {
    era,
    elements: [
      { naam: 'Gevel', opp: Math.round(area * 1.1), eenheid: 'Rc', waarde: era.muur, bron: `bouwjaar-typering ${era.label}` },
      { naam: 'Dak', opp: Math.round(area * 0.55), eenheid: 'Rc', waarde: era.dak, bron: `bouwjaar-typering ${era.label}` },
      { naam: 'Begane grondvloer', opp: Math.round(area * 0.55), eenheid: 'Rc', waarde: era.vloer, bron: `bouwjaar-typering ${era.label}` },
      {
        naam: 'Beglazing',
        opp: measuredGlass ?? Math.round(area * 0.22),
        eenheid: 'U',
        waarde: era.glasU,
        bron: measuredGlass !== null ? 'gemeten tijdens de opname' : `bouwjaar-typering ${era.label}`,
      },
    ],
  };
}

/** Raamoppervlak uit de opname, wanneer de ruimtes openingen hebben meegekregen. */
export function measuredGlassArea(p: Property): number | null {
  let total = 0;
  let found = false;
  for (const floor of p.floors) {
    for (const room of floor.rooms) {
      if (!room.openings?.length || !room.poly?.length) continue;
      const height = room.height ?? 2.6;
      for (const o of room.openings) {
        if (o.kind !== 'raam') continue;
        const a = room.poly[o.wall];
        const b = room.poly[(o.wall + 1) % room.poly.length];
        if (!a || !b) continue;
        found = true;
        // Zonder gemeten dorpelhoogte is een raam ongeveer de helft van de muur hoog.
        total += o.width * Math.min(height * 0.55, 1.6);
      }
    }
  }
  return found ? Math.round(total) : null;
}

export interface Installaties {
  verwarming: string;
  tapwater: string;
  ventilatie: string;
  zon: boolean;
  panelen: number;
}

export function installatiesFor(p: Property): Installaties {
  const y = p.year || 1995;
  const area = totalArea(p);
  const verwarming = y >= 2015 ? 'Warmtepomp (lucht/water)' : 'HR107 CV-ketel';
  const tapwater = y >= 2015 ? 'Warmtepomp (combi)' : 'Combi CV-ketel';
  const ventilatie =
    y < 1992 ? 'Natuurlijke toe- en afvoer' : y < 2015 ? 'Mechanische afzuiging (systeem C)' : 'Balansventilatie met WTW (systeem D)';
  const zon = p.label === 'A' || p.label === 'B';
  const panelen = zon ? Math.min(16, Math.max(8, Math.round(area / 9))) : 0;
  return { verwarming, tapwater, ventilatie, zon, panelen };
}

export interface Energiebehoefte {
  rows: { naam: string; waarde: number }[];
  opwek: number;
  bruto: number;
  netto: number;
}

export function energiebehoefteFor(p: Property, inst: Installaties): Energiebehoefte {
  const idx = p.energyIndex || 1.2;
  const verwarming = Math.round(idx * 68);
  const tapwater = Math.round(idx * 17);
  const ventilatie = Math.round(idx * 6);
  const verlichting = Math.round(idx * 8);
  const hulp = Math.round(idx * 4);
  const bruto = verwarming + tapwater + ventilatie + verlichting + hulp;
  const opwek = inst.zon ? -Math.round(inst.panelen * 6) : 0;
  return {
    rows: [
      { naam: 'Verwarming', waarde: verwarming },
      { naam: 'Warm tapwater', waarde: tapwater },
      { naam: 'Ventilatoren', waarde: ventilatie },
      { naam: 'Verlichting', waarde: verlichting },
      { naam: 'Hulpenergie', waarde: hulp },
    ],
    opwek,
    bruto,
    netto: bruto + opwek,
  };
}

/* ---------- wat-als simulator ---------- */

export const SIM_MEASURES = [
  { key: 'isolatie', label: 'Dak-, vloer- en spouwmuurisolatie', deltaIndex: 0.24, investering: 4500, besparing: 380 },
  { key: 'ketel', label: 'HR-ketel vervangen door (hybride) warmtepomp', deltaIndex: 0.16, investering: 7000, besparing: 320 },
  { key: 'zon', label: 'Zonnepanelen (10 panelen, 4,4 kWp)', deltaIndex: 0.19, investering: 6000, besparing: 450 },
] as const;

export type SimKey = (typeof SIM_MEASURES)[number]['key'];
export type SimState = Record<SimKey, boolean>;

export interface SimResult {
  idx: number;
  label: LabelKey;
  investering: number;
  besparing: number;
  terugverdientijd: number | null;
  active: boolean;
}

export function computeSim(p: Property, s: SimState): SimResult {
  const base = p.energyIndex || 1.2;
  let idx = base;
  let investering = 0;
  let besparing = 0;
  SIM_MEASURES.forEach((m) => {
    if (s[m.key]) {
      idx -= m.deltaIndex;
      investering += m.investering;
      besparing += m.besparing;
    }
  });
  idx = Math.max(0.35, round2(idx));
  return {
    idx,
    label: indexToLabel(idx),
    investering,
    besparing,
    terugverdientijd: besparing > 0 ? investering / besparing : null,
    active: investering > 0,
  };
}

/* ---------- verbeteradvies ---------- */

export interface Advies {
  tekst: string;
  investering: string;
  terugverdientijd: string;
}

const ADVIES_MAP: Record<string, Advies[]> = {
  A: [
    { tekst: 'Uw woning heeft al het hoogste label. Overweeg een thuisbatterij om zelf opgewekte zonne-energie beter te benutten.', investering: '€ 4.000 – € 7.000', terugverdientijd: '8–10 jaar' },
    { tekst: 'Periodiek onderhoud aan de installatie houdt de prestatie op peil.', investering: '€ 150 / jaar', terugverdientijd: 'n.v.t. (onderhoud)' },
  ],
  B: [
    { tekst: 'Dubbel glas vervangen door HR++ of triple glas verbetert de isolatie verder.', investering: '€ 2.500 – € 4.000', terugverdientijd: '7–9 jaar' },
    { tekst: 'Zonnepanelen kunnen de energie-index nog dichter bij label A brengen.', investering: '€ 5.000 – € 7.000', terugverdientijd: '6–8 jaar' },
  ],
  C: [
    { tekst: 'Spouwmuurisolatie en vloerisolatie zijn vaak rendabel bij dit type woning.', investering: '€ 1.800 – € 2.800', terugverdientijd: '4–6 jaar' },
    { tekst: 'Een hybride warmtepomp verlaagt het gasverbruik aanzienlijk.', investering: '€ 6.000 – € 9.000', terugverdientijd: '7–10 jaar' },
    { tekst: 'HR++ beglazing vermindert warmteverlies via de ramen.', investering: '€ 2.500 – € 4.000', terugverdientijd: '7–9 jaar' },
  ],
  D: [
    { tekst: 'Dak-, vloer- en spouwmuurisolatie samen geven de grootste labelsprong.', investering: '€ 5.000 – € 8.000', terugverdientijd: '5–7 jaar' },
    { tekst: 'Overweeg vervanging van een oude CV-ketel door een (hybride) warmtepomp.', investering: '€ 6.000 – € 9.000', terugverdientijd: '6–9 jaar' },
    { tekst: 'Zonnepanelen verlagen de energie-index direct.', investering: '€ 5.000 – € 7.000', terugverdientijd: '6–8 jaar' },
  ],
  E: [
    { tekst: 'Isoleer eerst het dak en de vloer: dit levert doorgaans de snelste labelverbetering op.', investering: '€ 4.000 – € 6.500', terugverdientijd: '4–6 jaar' },
    { tekst: 'Vervang enkel glas door HR++ beglazing.', investering: '€ 3.000 – € 5.000', terugverdientijd: '6–8 jaar' },
    { tekst: 'Laat een energieadvies-op-maat opstellen voor de meest kosteneffectieve volgorde van maatregelen.', investering: '€ 350 – € 500', terugverdientijd: 'n.v.t. (advies)' },
  ],
};
ADVIES_MAP.F = ADVIES_MAP.E;
ADVIES_MAP.G = ADVIES_MAP.E;

export function adviesForLabel(label: string | null): Advies[] {
  return (label && ADVIES_MAP[label]) || ADVIES_MAP.D;
}
