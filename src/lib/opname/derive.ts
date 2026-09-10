import type { Answer } from './schema';
import type { OpnameRecord, OpnameRow } from './record';

/**
 * From the opnameformulier to the numbers NTA 8800 works with.
 *
 * A basisopname records what can be seen, not measured Rc-waarden. NTA 8800
 * gives forfaitaire waarden for that case: an uninsulated construction has a
 * value that follows from its build-up, an insulated one without a visible
 * thickness gets the na-isolatie value, and a visible thickness is converted
 * with a lambda of 0,04 W/mK. Every element below says which of those routes
 * produced it, so a report never presents a forfaitaire value as a measurement.
 */

const LAMBDA = 0.04;

/** Rc of the bare construction, before any insulation. */
const BASE_RC: Record<string, number> = {
  gevelSpouw: 0.43,
  gevelMassief: 0.19,
  dak: 0.22,
  vloer: 0.15,
};

/** Rc when the surveyor sees insulation but cannot read its thickness. */
const NA_ISOLATIE_RC = 1.3;

/** Uw per glassoort and kozijntype, in W/m²K. */
const UW: Record<string, Record<string, number>> = {
  A: { A: 1.0, B: 1.4, C: 1.9 },
  B: { A: 1.4, B: 1.8, C: 2.3 },
  C: { A: 1.8, B: 2.1, C: 2.6 },
  D: { A: 2.1, B: 2.4, C: 2.9 },
  E: { A: 2.6, B: 2.9, C: 3.4 },
  F: { A: 4.2, B: 4.6, C: 5.2 },
};

const U_DEUR: Record<string, number> = { A: 2.0, B: 3.4 };

function num(v: Answer | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: Answer | undefined): string | null {
  return typeof v === 'string' && v ? v : null;
}

export interface DerivedElement {
  naam: string;
  opp: number;
  eenheid: 'Rc' | 'U';
  waarde: number;
  bron: string;
}

/**
 * Bouwjaar-typering, the forfaitaire route NTA 8800 falls back on when the
 * surveyor could not see whether a construction is insulated.
 */
function eraRc(bouwjaar: number | null): { muur: number; dak: number; vloer: number; label: string } {
  const y = bouwjaar ?? 1995;
  if (y < 1975) return { muur: 0.5, dak: 0.8, vloer: 0.5, label: 'vóór 1975' };
  if (y < 1992) return { muur: 1.3, dak: 1.3, vloer: 1.3, label: '1975–1992' };
  if (y < 2006) return { muur: 2.0, dak: 2.0, vloer: 2.0, label: '1992–2006' };
  if (y < 2015) return { muur: 2.5, dak: 2.5, vloer: 2.5, label: '2006–2015' };
  return { muur: 4.5, dak: 6.0, vloer: 3.5, label: '2015 en later' };
}

function rcFor(
  row: OpnameRow,
  base: number,
  fallback: { waarde: number; label: string },
): { waarde: number; bron: string } | null {
  // Paneelconstructies hebben geen isolatiekolom, alleen een dikte.
  if (row.isolatie === undefined) {
    const d = num(row.dikte);
    return d && d > 0
      ? { waarde: round2(Math.min(8, base + d / 1000 / LAMBDA)), bron: `${d} mm isolatie gemeten, λ 0,04 W/mK` }
      : { waarde: fallback.waarde, bron: `dikte onbekend, bouwjaar-typering ${fallback.label}` };
  }
  const isolatie = str(row.isolatie);
  // Een nog niet opgenomen bouwdeel mag niet uit de berekening vallen: dan zou
  // dat oppervlak als verliesvrij tellen. Het krijgt de forfaitaire waarde en
  // het rapport zegt dat het nog moet worden opgenomen.
  if (!isolatie) {
    return { waarde: fallback.waarde, bron: `nog niet opgenomen, bouwjaar-typering ${fallback.label}` };
  }
  if (isolatie === 'nee') return { waarde: round2(base), bron: 'geen isolatie waargenomen' };
  // Onbekend mag het oppervlak niet uit de berekening laten vallen: dan telt de
  // forfaitaire waarde bij het bouwjaar, en het rapport zegt dat er ook bij.
  if (isolatie === 'onbekend') {
    return { waarde: fallback.waarde, bron: `isolatie niet te zien, bouwjaar-typering ${fallback.label}` };
  }
  const dikte = num(row.dikte);
  if (dikte && dikte > 0) {
    return {
      waarde: round2(Math.min(8, base + dikte / 1000 / LAMBDA)),
      bron: `${dikte} mm isolatie gemeten, λ 0,04 W/mK`,
    };
  }
  return {
    waarde: NA_ISOLATIE_RC,
    bron: isolatie === 'na' ? 'nageïsoleerd, dikte niet zichtbaar' : 'geïsoleerd, dikte niet zichtbaar',
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumOpp(rows: OpnameRow[]): number {
  return Math.round(rows.reduce((s, r) => s + (num(r.opp) ?? 0), 0) * 10) / 10;
}

/**
 * The thermische schil as the opname recorded it. Returns null when the record
 * has nothing usable, so the caller can fall back on the bouwjaar-typering.
 */
export function envelopeFromOpname(record: OpnameRecord | null | undefined): DerivedElement[] | null {
  if (!record) return null;
  const out: DerivedElement[] = [];

  const era = eraRc(num(record.values.bouwjaar));
  const groups: { rows: OpnameRow[]; base: number; naam: string; forfaitair: number }[] = [
    { rows: record.rows.gevels ?? [], base: BASE_RC.gevelSpouw!, naam: 'Gevel', forfaitair: era.muur },
    { rows: record.rows.daken ?? [], base: BASE_RC.dak!, naam: 'Dak', forfaitair: era.dak },
    { rows: record.rows.vloeren ?? [], base: BASE_RC.vloer!, naam: 'Vloer', forfaitair: era.vloer },
    { rows: record.rows.panelen ?? [], base: BASE_RC.gevelSpouw!, naam: 'Paneel', forfaitair: era.muur },
  ];

  for (const g of groups) {
    for (const row of g.rows) {
      const opp = num(row.opp);
      if (!opp) continue;
      const base = g.naam === 'Gevel' && str(row.spouwvulling) === 'geenspouw' ? BASE_RC.gevelMassief! : g.base;
      const rc = rcFor(row, base, { waarde: g.forfaitair, label: era.label });
      if (!rc) continue;
      out.push({
        naam: str(row.naam) ?? g.naam,
        opp: Math.round(opp * 10) / 10,
        eenheid: 'Rc',
        waarde: rc.waarde,
        bron: rc.bron,
      });
    }
  }

  // Ramen worden per glassoort en kozijntype samengenomen: dat is hoe de
  // rekenkern ze ook groepeert, en het houdt de tabel leesbaar.
  const perGlas = new Map<string, { opp: number; u: number; glas: string; kozijn: string }>();
  for (const row of record.rows.ramen ?? []) {
    const opp = num(row.opp);
    const glas = str(row.glas);
    // Kozijntype onbekend telt als het slechtste van de drie, zodat een
    // onvolledige opname de prestatie nooit te rooskleurig maakt.
    const kozijn = str(row.kozijn) ?? 'C';
    if (!opp || !glas) continue;
    const u = UW[glas]?.[kozijn];
    if (u === undefined) continue;
    const key = `${glas}-${kozijn}`;
    const cur = perGlas.get(key) ?? { opp: 0, u, glas, kozijn };
    cur.opp += opp;
    perGlas.set(key, cur);
  }
  const glasLabel: Record<string, string> = {
    A: 'drievoudig HR', B: 'HR++', C: 'HR+', D: 'dubbelglas met coating', E: 'voorzetglas', F: 'enkelglas',
  };
  for (const g of perGlas.values()) {
    out.push({
      naam: `Beglazing ${glasLabel[g.glas] ?? g.glas}`,
      opp: Math.round(g.opp * 10) / 10,
      eenheid: 'U',
      waarde: g.u,
      bron: `glassoort ${g.glas} in kozijntype ${g.kozijn}, forfaitaire Uw`,
    });
  }

  const deuren = (record.rows.deuren ?? []).filter((r) => num(r.opp) && str(r.deur));
  if (deuren.length) {
    const opp = sumOpp(deuren);
    const u =
      deuren.reduce((s, r) => s + (U_DEUR[str(r.deur)!] ?? 3.4) * (num(r.opp) ?? 0), 0) / (opp || 1);
    out.push({
      naam: 'Deuren',
      opp,
      eenheid: 'U',
      waarde: round2(u),
      bron: 'type deur uit de opname, forfaitaire U-waarde',
    });
  }

  return out.length ? out : null;
}

/** Glass area per oriëntatie, which is what the zontoetreding is computed over. */
export function glasPerOrientatie(record: OpnameRecord | null | undefined): { orientatie: string; opp: number }[] {
  if (!record) return [];
  const acc = new Map<string, number>();
  for (const row of record.rows.ramen ?? []) {
    const opp = num(row.opp);
    const o = str(row.orientatie);
    if (!opp || !o) continue;
    acc.set(o, (acc.get(o) ?? 0) + opp);
  }
  return [...acc.entries()]
    .map(([orientatie, opp]) => ({ orientatie, opp: Math.round(opp * 10) / 10 }))
    .sort((a, b) => b.opp - a.opp);
}

const VERWARMING_LABEL: Record<string, string> = {
  hr107: 'HR107 CV-ketel', hr104: 'HR104 CV-ketel', hr100: 'HR100 CV-ketel',
  vr: 'VR-ketel', cr: 'Conventionele ketel', crWaakvlam: 'Conventionele ketel met waakvlam',
  wpElektrisch: 'Elektrische warmtepomp', wpGas: 'Gaswarmtepomp', elektrisch: 'Elektrische verwarming',
  gaskachelMetAfvoer: 'Lokale gaskachel met afvoer', gaskachelZonderAfvoer: 'Lokale gaskachel zonder afvoer',
  oliekachelMetAfvoer: 'Lokale oliekachel met afvoer', oliekachelZonderAfvoer: 'Lokale oliekachel zonder afvoer',
  luchtverwarmer: 'Direct gestookte luchtverwarmer', wkk: 'WKK',
  biomassakachel: 'Biomassakachel', biomassaketel: 'Biomassaketel',
  extern: 'Stadsverwarming', onbekend: 'Onbekend',
};

const TAPWATER_LABEL: Record<string, string> = {
  combiketel: 'Combitoestel, zelfde toestel als de verwarming', combiWkk: 'Combitoestel met microWKK',
  geiser: 'Keukengeiser', gasboiler: 'Gasboiler', elektroboiler: 'Elektroboiler',
  doorstroom: 'Elektrisch doorstroomtoestel', wpBoiler: 'Warmtepompboiler',
  boosterWp: 'Booster-warmtepomp', indirectVat: 'Indirect verwarmd voorraadvat',
  afleverset: 'Afleverset stadsverwarming', biomassa: 'Vaste biomassa',
};

export interface InstallatiesUitOpname {
  verwarming: string;
  tapwater: string;
  ventilatie: string;
  zon: boolean;
  panelen: number;
}

/** The installations as recorded, rather than guessed from the build year. */
export function installatiesFromOpname(record: OpnameRecord | null | undefined): InstallatiesUitOpname | null {
  if (!record) return null;
  const v = record.values;
  const opwekker = str(v.opwekker1);
  const tap = str(v.tapwaterOpwekker);
  const vent = str(v.ventilatietype);
  if (!opwekker && !tap && !vent) return null;
  const pv = str(v.pv) === 'ja';
  return {
    verwarming: (opwekker && VERWARMING_LABEL[opwekker]) || 'Onbekend',
    tapwater: (tap && TAPWATER_LABEL[tap]) || 'Onbekend',
    ventilatie: vent ? `Systeem ${vent}` : 'Onbekend',
    zon: pv,
    panelen: pv ? num(v.pvAantal) ?? 0 : 0,
  };
}
