import { unitHash } from './format';
import type { LabelKey } from './types';

export const PUB_TYPES = [
  'Tussenwoning',
  'Hoekwoning',
  'Twee-onder-een-kap',
  'Vrijstaande woning',
  'Bovenwoning',
] as const;

const PUB_TYPE_FACTOR: Record<string, number> = {
  Tussenwoning: 0,
  Hoekwoning: 0.05,
  'Twee-onder-een-kap': 0.1,
  Bovenwoning: 0.04,
  'Vrijstaande woning': 0.18,
};

export const PUB_BOUWLAGEN = ['1', '2', '3 of meer'] as const;

export const PUB_VERWARMING = [
  'CV-ketel (gas)',
  'Hybride warmtepomp',
  'Volledig elektrische warmtepomp',
  'Stadswarmte / blokverwarming',
  'Weet ik niet',
] as const;

const PUB_VERWARMING_FACTOR: Record<string, number> = {
  'CV-ketel (gas)': 0.16,
  'Hybride warmtepomp': 0.0,
  'Volledig elektrische warmtepomp': -0.12,
  'Stadswarmte / blokverwarming': -0.05,
  'Weet ik niet': 0.06,
};

export const PUB_JANEE = ['Ja', 'Nee', 'Weet ik niet'] as const;

const PUB_ISOLATIE_FACTOR: Record<string, number> = { Ja: -0.08, Nee: 0.14, 'Weet ik niet': 0.03 };

export const PUB_GLAS = ['Enkel glas', 'Dubbel glas', 'HR++ glas', 'Triple glas', 'Weet ik niet'] as const;

const PUB_GLAS_FACTOR: Record<string, number> = {
  'Enkel glas': 0.2,
  'Dubbel glas': 0.07,
  'HR++ glas': -0.05,
  'Triple glas': -0.11,
  'Weet ik niet': 0.04,
};

export type PhotoKey = 'voorgevel' | 'installatie' | 'meterkast';

export const PUB_PHOTO_SLOTS: { key: PhotoKey; label: string; required: boolean }[] = [
  { key: 'voorgevel', label: 'Voorgevel (voorkant van de woning)', required: true },
  { key: 'installatie', label: 'CV-ketel of warmtepomp', required: false },
  { key: 'meterkast', label: 'Meterkast', required: false },
];

export interface IndicatieInput {
  postcode: string;
  huisnummer: string;
  straat: string;
  plaats: string;
  type: string;
  year: string;
  area: string;
  bouwlagen: string;
  verwarming: string;
  dakIsolatie: string;
  gevelIsolatie: string;
  glas: string;
  zonnepanelen: boolean;
  zonAantal: string;
}

export type TipIcon = 'wall' | 'pump' | 'sun' | 'glass';

export interface IndicatieTip {
  icon: TipIcon;
  text: string;
  weight: number;
}

export interface IndicatieResult {
  label: LabelKey;
  index: number;
  tips: IndicatieTip[];
}

/**
 * Postcode-check zoals postcode.nl/BAG die in het echt zou doen: op basis van de vier cijfers
 * van de postcode wordt een plausibele plaats gekozen, en op basis van postcode + huisnummer
 * een straatnaam uit die plaats.
 */
const PUB_POSTCODE_RANGES: { max: number; city: string }[] = [
  { max: 1099, city: 'Amsterdam' }, { max: 1199, city: 'Diemen' }, { max: 1250, city: 'Hilversum' },
  { max: 1349, city: 'Almere' }, { max: 1440, city: 'Weesp' }, { max: 1560, city: 'Zaandam' },
  { max: 1650, city: 'Hoorn' }, { max: 1830, city: 'Alkmaar' }, { max: 1949, city: 'Velsen' },
  { max: 1999, city: 'Beverwijk' }, { max: 2099, city: 'Haarlem' }, { max: 2180, city: 'Hoofddorp' },
  { max: 2290, city: 'Katwijk' }, { max: 2390, city: 'Leiden' }, { max: 2490, city: 'Alphen aan den Rijn' },
  { max: 2599, city: 'Den Haag' }, { max: 2699, city: 'Delft' }, { max: 2760, city: 'Zoetermeer' },
  { max: 2890, city: 'Gouda' }, { max: 2995, city: 'Capelle aan den IJssel' }, { max: 3099, city: 'Rotterdam' },
  { max: 3199, city: 'Vlaardingen' }, { max: 3299, city: 'Spijkenisse' }, { max: 3399, city: 'Dordrecht' },
  { max: 3499, city: 'Nieuwegein' }, { max: 3599, city: 'Utrecht' }, { max: 3699, city: 'Breukelen' },
  { max: 3999, city: 'Amersfoort' }, { max: 4099, city: 'Tiel' }, { max: 4199, city: 'Culemborg' },
  { max: 4299, city: 'Gorinchem' }, { max: 4399, city: 'Zierikzee' }, { max: 4499, city: 'Goes' },
  { max: 4599, city: 'Terneuzen' }, { max: 4699, city: 'Bergen op Zoom' }, { max: 4799, city: 'Roosendaal' },
  { max: 4899, city: 'Breda' }, { max: 4999, city: 'Oosterhout' }, { max: 5099, city: 'Tilburg' },
  { max: 5199, city: 'Waalwijk' }, { max: 5299, city: "'s-Hertogenbosch" }, { max: 5399, city: 'Zaltbommel' },
  { max: 5499, city: 'Veghel' }, { max: 5599, city: 'Veldhoven' }, { max: 5699, city: 'Eindhoven' },
  { max: 5799, city: 'Helmond' }, { max: 5899, city: 'Venray' }, { max: 5999, city: 'Venlo' },
  { max: 6099, city: 'Weert' }, { max: 6199, city: 'Sittard' }, { max: 6299, city: 'Maastricht' },
  { max: 6399, city: 'Valkenburg' }, { max: 6499, city: 'Heerlen' }, { max: 6599, city: 'Nijmegen' },
  { max: 6699, city: 'Wijchen' }, { max: 6799, city: 'Wageningen' }, { max: 6899, city: 'Arnhem' },
  { max: 6999, city: 'Zevenaar' }, { max: 7099, city: 'Doetinchem' }, { max: 7199, city: 'Winterswijk' },
  { max: 7299, city: 'Zutphen' }, { max: 7399, city: 'Apeldoorn' }, { max: 7499, city: 'Deventer' },
  { max: 7599, city: 'Enschede' }, { max: 7699, city: 'Almelo' }, { max: 7799, city: 'Hardenberg' },
  { max: 7899, city: 'Emmen' }, { max: 7999, city: 'Hoogeveen' }, { max: 8099, city: 'Zwolle' },
  { max: 8199, city: 'Nijverdal' }, { max: 8299, city: 'Lelystad' }, { max: 8399, city: 'Emmeloord' },
  // Friesland is fijnmaziger opgedeeld: dit is het kerngebied van Krik je energielabel op en
  // hier moet de plaatsnaam echt kloppen.
  { max: 8410, city: 'Gorredijk' }, { max: 8465, city: 'Heerenveen' }, { max: 8478, city: 'Wolvega' },
  { max: 8499, city: 'Akkrum' }, { max: 8508, city: 'Joure' }, { max: 8561, city: 'Balk' },
  { max: 8699, city: 'Sneek' }, { max: 8701, city: 'Bolsward' }, { max: 8711, city: 'Workum' },
  { max: 8754, city: 'Makkum' }, { max: 8799, city: 'Witmarsum' }, { max: 8809, city: 'Franeker' },
  { max: 8862, city: 'Harlingen' }, { max: 8942, city: 'Leeuwarden' }, { max: 9003, city: 'Grou' },
  { max: 9060, city: 'Stiens' }, { max: 9099, city: 'Sint Annaparochie' }, { max: 9103, city: 'Dokkum' },
  { max: 9145, city: 'Damwâld' }, { max: 9199, city: 'Holwerd' }, { max: 9207, city: 'Drachten' },
  { max: 9231, city: 'Surhuisterveen' }, { max: 9251, city: 'Burgum' }, { max: 9285, city: 'Buitenpost' },
  { max: 9299, city: 'Kollum' }, { max: 9599, city: 'Groningen' },
  { max: 9999, city: 'Winschoten' },
];

/** Echt bestaande straatnamen per plaats, zodat de ingevulde straat in de juiste plaats ligt. */
const PUB_CITY_STREETS: Record<string, string[]> = {
  Amsterdam: ['Kalverstraat', 'Prinsengracht', 'Vondelstraat', 'Ferdinand Bolstraat', 'Overtoom', 'Van Baerlestraat'],
  Zaandam: ['Gedempte Gracht', 'Rooswijk', 'Provincialeweg', 'Czaar Peterstraat', 'Vincent van Goghweg'],
  Haarlem: ['Grote Houtstraat', 'Barteljorisstraat', 'Zijlstraat', 'Kruisstraat'],
  Hilversum: ['Kerkstraat', 'Groest', 'Leeuwenstraat', 'Vaartweg'],
  Alkmaar: ['Langestraat', 'Fnidsen', 'Laat', 'Kanaalkade'],
  Delft: ['Markt', 'Oude Delft', 'Nieuwstraat', 'Choorstraat'],
  Gouda: ['Markt', 'Hoogstraat', 'Kleiweg', 'Turfmarkt'],
  Zoetermeer: ['Dorpsstraat', 'Stadhuisplein', 'Nieuwe Passage'],
  Amersfoort: ['Lieve Vrouwekerkhof', 'Krankeledenstraat', 'Utrechtsestraat', 'Langestraat'],
  Deventer: ['Grote Kerkhof', 'Lange Bisschopstraat', 'Brink'],
  Enschede: ['Oude Markt', 'Van Heekplein', 'Haaksbergerstraat'],
  Heerlen: ['Promenade', 'Geleenstraat'],
  'Den Haag': ['Noordeinde', 'Spuistraat', 'Laan van Meerdervoort', 'Zeestraat', 'Prinsegracht'],
  Leiden: ['Breestraat', 'Haarlemmerstraat', 'Rapenburg', 'Steenschuur', 'Hooigracht'],
  Rotterdam: ['Coolsingel', 'Lijnbaan', 'Witte de Withstraat', 'Meent', 'Nieuwe Binnenweg'],
  Dordrecht: ['Voorstraat', 'Groenmarkt', 'Bagijnhof', 'Wijnstraat', 'Grotekerksbuurt'],
  Utrecht: ['Oudegracht', 'Neude', 'Lange Viestraat', 'Biltstraat', 'Twijnstraat'],
  Breda: ['Ginnekenstraat', 'Grote Markt', 'Nieuwe Ginnekenstraat', 'Veemarktstraat', 'Catharinastraat'],
  Middelburg: ['Lange Delft', 'Korte Delft', 'Segeersstraat', 'Lange Noordstraat', 'Nieuwe Burg'],
  Vlissingen: ['Walstraat', 'Aan de Rijn', 'Nieuwendijk', 'Bellamypark', 'Scheldestraat'],
  Eindhoven: ['Stratumseind', 'Demer', 'Rechtestraat', 'Kruisstraat', 'Vestdijk'],
  Tilburg: ['Heuvelstraat', 'Nieuwlandstraat', 'Korte Heuvel', 'Stationsstraat', 'Piusstraat'],
  "'s-Hertogenbosch": ['Hinthamerstraat', 'Vughterstraat', 'Kerkstraat', 'Markt', 'Verwersstraat'],
  Maastricht: ['Grote Staat', 'Vrijthof', 'Stokstraat', 'Wycker Brugstraat', 'Boschstraat'],
  Venlo: ['Vleesstraat', 'Grote Kerkstraat', 'Parade', 'Jodenstraat', 'Klaasstraat'],
  Nijmegen: ['Grotestraat', 'Burchtstraat', 'Van Welderenstraat', 'Broerstraat', 'Ziekerstraat'],
  Arnhem: ['Ketelstraat', 'Jansstraat', 'Bakkerstraat', 'Rijnstraat', 'Steenstraat'],
  Apeldoorn: ['Hoofdstraat', 'Kanaalstraat', 'Deventerstraat', 'Loolaan', 'Asselsestraat'],
  Zwolle: ['Diezerstraat', 'Melkmarkt', 'Grote Markt', 'Luttekestraat', 'Sassenstraat'],
  Lelystad: ['Stadhuisplein', 'Waagplein', 'Agorabaan', 'Neringpassage', 'Havendreef'],
  Almere: ['Grote Markt', 'Esplanade', 'Stedenwijk', 'Kerkgracht', 'Passage'],
  Heerenveen: ['Dracht', 'Herenwal', 'Burgemeester Kuperusplein', 'Mindert Frankenaweg', 'Kerkstraat'],
  Sneek: ['Oosterdijk', 'Stationsstraat', 'Leeuwenburg', 'Kruizebroederstraat', 'Marktstraat'],
  Franeker: ['Voorstraat', 'Zilverstraat', 'Breedeplaats', 'Godsacker', 'Noord'],
  Harlingen: ['Voorstraat', 'Grote Bredeplaats', 'Zuiderhaven', 'Noorderhaven', 'Kimswerderweg'],
  Leeuwarden: ['Nieuwestad', 'Wirdumerdijk', 'Voorstreek', 'Zaailand', 'Tweebaksmarkt', 'Sacramentsstraat'],
  Grou: ['Hoofdstraat', 'Raadhuisplein', 'Kade', 'Wilhelminastraat', 'Kerkepad'],
  Dokkum: ['Diepswal', 'Legeweg', 'Oostersingel', 'De Zijl', 'Markt', 'Hoogstraat', 'Grote Breedstraat', 'Bevrijdingslaan', 'Aalsumerweg', 'Birdaarderstraatweg'],
  Drachten: ['Zuidkade', 'Noordkade', 'Moleneind', 'Torenstraat', 'Raadhuisplein'],
  Groningen: ['Grote Markt', 'Oude Ebbingestraat', 'Herestraat', 'Folkingestraat', 'Vismarkt'],
  Winschoten: ['Torenstraat', 'Venne', 'Blijhamsterstraat', 'Stationsweg', 'Langestraat'],
  Gorredijk: ['Buorren', 'Hoofdstraat', 'Schoolstraat'],
  Wolvega: ['Hoofdstraat', 'Herenstraat', 'Schoolstraat'],
  Akkrum: ['Buorren', 'Kade', 'Schoolstraat'],
  Joure: ['Midstraat', 'Marktstraat', 'Schoolstraat'],
  Balk: ['Kerkstraat', 'Wilhelminastraat', 'Schoolstraat'],
  Bolsward: ['Marktstraat', 'Kerkstraat', 'Snekerstraat', 'Grote Dijlakker'],
  Workum: ['Noard', 'Súd', 'Merk', 'Spoardyk'],
  Makkum: ['Kerkstraat', 'Buorren', 'Turfmarkt'],
  Witmarsum: ['Buorren', 'Hoofdweg', 'Schoolstraat'],
  Stiens: ['Buorren', 'Schoolstraat', 'Hoofdstraat'],
  'Sint Annaparochie': ['Buorren', 'Hoofdstraat', 'Schoolstraat'],
  Damwâld: ['Skoallestrjitte', 'Foarwei', 'Buorren'],
  Holwerd: ['Buorren', 'Kerkstraat', 'Hoofdstraat'],
  Surhuisterveen: ['Buorren', 'Schoolstraat', 'Hoofdstraat'],
  Burgum: ['Buorren', 'Schoolstraat', 'Hoofdstraat'],
  Buitenpost: ['Voorstraat', 'Buorren', 'Schoolstraat'],
  Kollum: ['Voorstraat', 'Buorren', 'Schoolstraat'],
};

export function cityForPostcode(pc4: number): string {
  for (const r of PUB_POSTCODE_RANGES) {
    if (pc4 <= r.max) return r.city;
  }
  return 'Leeuwarden';
}

export function simulatePostcodeLookup(
  postcode: string,
  huisnummer: string,
): { straat: string; plaats: string } | null {
  const digits = (postcode || '').replace(/[^0-9]/g, '');
  if (digits.length < 4 || !huisnummer) return null;
  const plaats = cityForPostcode(Number(digits.slice(0, 4)));
  const streets = PUB_CITY_STREETS[plaats] ?? ['Kerkstraat', 'Dorpsstraat', 'Molenweg'];
  const h = Math.floor(unitHash(postcode.toUpperCase().replace(/\s/g, '') + '|' + huisnummer) * 100000);
  return { straat: streets[h % streets.length], plaats };
}

export function computeIndicatie(input: IndicatieInput): IndicatieResult {
  const year = Number(input.year) || 1995;
  const area = Number(input.area) || 120;
  const type = input.type || 'Tussenwoning';
  const verwarming = input.verwarming || 'Weet ik niet';
  const dak = input.dakIsolatie || 'Weet ik niet';
  const gevel = input.gevelIsolatie || 'Weet ik niet';
  const glas = input.glas || 'Weet ik niet';
  const zonAantal = input.zonnepanelen ? Number(input.zonAantal) || 6 : 0;
  const seed = `${input.straat}|${input.huisnummer}|${input.postcode}|${type}|${year}|${area}|${verwarming}|${dak}|${gevel}|${glas}|${zonAantal}`;
  const noise = unitHash(seed);
  const yearFactor = Math.min(Math.max(2026 - year, 0), 120) / 120;
  const typeFactor = PUB_TYPE_FACTOR[type] ?? 0.08;
  const areaFactor = Math.max(-0.08, Math.min(0.12, (area - 120) / 500));
  const verwarmingFactor = PUB_VERWARMING_FACTOR[verwarming] ?? 0.06;
  const dakFactor = PUB_ISOLATIE_FACTOR[dak] ?? 0.03;
  const gevelFactor = PUB_ISOLATIE_FACTOR[gevel] ?? 0.03;
  const glasFactor = PUB_GLAS_FACTOR[glas] ?? 0.04;
  const zonFactor = Math.max(-0.15, -zonAantal * 0.012);
  const raw =
    0.55 + yearFactor * 0.5 + typeFactor + areaFactor + verwarmingFactor + dakFactor + gevelFactor +
    glasFactor + zonFactor + (noise - 0.5) * 0.12;
  const index = Math.round(Math.max(0.42, Math.min(2.2, raw)) * 100) / 100;

  let label: LabelKey;
  if (index <= 0.9) label = 'A';
  else if (index <= 1.08) label = 'B';
  else if (index <= 1.28) label = 'C';
  else if (index <= 1.52) label = 'D';
  else if (index <= 1.78) label = 'E';
  else if (index <= 2.02) label = 'F';
  else label = 'G';

  // Het verbeteradvies volgt de ingevulde kenmerken, niet alleen het bouwjaar, zodat het advies
  // per invulling echt verschilt (net als in het volledige rapport).
  const tips: IndicatieTip[] = [];
  if (glas === 'Enkel glas' || glas === 'Dubbel glas') {
    tips.push({
      icon: 'glass',
      text:
        glas === 'Enkel glas'
          ? 'Vervang enkel glas door HR++ of triple glas'
          : 'Dubbel glas vervangen door HR++ of triple glas',
      weight: 3,
    });
  }
  if (dak === 'Nee' || dak === 'Weet ik niet') {
    tips.push({ icon: 'wall', text: 'Isoleer het dak: dit levert vaak de snelste labelverbetering op', weight: dak === 'Nee' ? 4 : 2 });
  }
  if (gevel === 'Nee' || gevel === 'Weet ik niet') {
    tips.push({ icon: 'wall', text: 'Isoleer de gevel of spouwmuur', weight: gevel === 'Nee' ? 3 : 1 });
  }
  if (verwarming === 'CV-ketel (gas)' || verwarming === 'Weet ik niet') {
    tips.push({ icon: 'pump', text: 'Overstap naar een (hybride) warmtepomp', weight: 2 });
  }
  if (zonAantal === 0) {
    tips.push({ icon: 'sun', text: 'Zonnepanelen op het meest zongerichte dakvlak', weight: 1 });
  }
  tips.sort((a, b) => b.weight - a.weight);
  if (tips.length === 0) {
    tips.push({ icon: 'sun', text: 'Uw woning scoort al goed; periodiek onderhoud houdt de prestatie op peil', weight: 0 });
  }
  return { label, index, tips: tips.slice(0, 4) };
}
