/**
 * Adres- en objectgegevens ophalen bij de bron.
 *
 * PDOK Locatieserver is open en heeft geen sleutel nodig, dus adres, postcode en
 * coördinaten komen altijd echt binnen. De BAG- en EP-Online-API's vragen om een
 * sleutel: zonder sleutel meldt de koppeling dat ze niet is geconfigureerd, in
 * plaats van een plausibel getal te verzinnen.
 */

const PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

export interface AddressHit {
  id: string;
  weergavenaam: string;
  type: string;
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huis_nlt?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  lat?: number;
  lon?: number;
  adresseerbaarobject_id?: string;
  nummeraanduiding_id?: string;
}

interface PdokDoc {
  id: string;
  weergavenaam: string;
  type: string;
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huis_nlt?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  centroide_ll?: string;
  adresseerbaarobject_id?: string;
  nummeraanduiding_id?: string;
}

const FIELDS = [
  'id', 'weergavenaam', 'type', 'straatnaam', 'huisnummer', 'huisletter', 'huis_nlt',
  'postcode', 'woonplaatsnaam', 'centroide_ll', 'adresseerbaarobject_id', 'nummeraanduiding_id',
].join(',');

function parsePoint(s: string | undefined): { lat?: number; lon?: number } {
  const m = s?.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!m) return {};
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

function toHit(d: PdokDoc): AddressHit {
  const { lat, lon } = parsePoint(d.centroide_ll);
  return {
    id: d.id,
    weergavenaam: d.weergavenaam,
    type: d.type,
    straatnaam: d.straatnaam,
    huisnummer: d.huisnummer,
    huisletter: d.huisletter,
    huis_nlt: d.huis_nlt,
    postcode: d.postcode,
    woonplaatsnaam: d.woonplaatsnaam,
    lat,
    lon,
    adresseerbaarobject_id: d.adresseerbaarobject_id,
    nummeraanduiding_id: d.nummeraanduiding_id,
  };
}

/** Vrije zoekopdracht op adres, beperkt tot BAG-adressen. */
export async function searchAddress(query: string, rows = 8): Promise<AddressHit[]> {
  if (!query.trim()) return [];
  const url = `${PDOK}/free?q=${encodeURIComponent(query)}&rows=${rows}&fq=type:adres&fl=${encodeURIComponent(FIELDS)}`;
  const res = await fetch(url, { headers: { accept: 'application/json' }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`PDOK Locatieserver gaf status ${res.status}`);
  const json = (await res.json()) as { response?: { docs?: PdokDoc[] } };
  return (json.response?.docs ?? []).map(toHit);
}

/** Postcode + huisnummer naar één adres, de route die het formulier gebruikt. */
export async function lookupByPostcode(postcode: string, huisnummer: string): Promise<AddressHit | null> {
  const pc = postcode.replace(/\s+/g, '').toUpperCase();
  if (!/^\d{4}[A-Z]{2}$/.test(pc) || !huisnummer.trim()) return null;
  const hits = await searchAddress(`${pc} ${huisnummer.trim()}`, 1);
  return hits[0] ?? null;
}

export interface BagObject {
  bouwjaar: number | null;
  oppervlakte: number | null;
  gebruiksdoel: string[];
  status: string | null;
}

export interface LookupResult {
  address: AddressHit | null;
  bag: BagObject | null;
  epOnline: EpOnlineLabel | null;
  /** Koppelingen die niet zijn geconfigureerd, met de reden erbij. */
  unavailable: { source: string; reason: string }[];
}

export interface EpOnlineLabel {
  label: string;
  registratiedatum: string;
  geldigTot: string | null;
  berekeningstype: string | null;
}

/**
 * BAG Individuele Bevragingen v2. Vereist een sleutel van het Kadaster
 * (BAG_API_KEY); zonder sleutel geeft deze functie null terug.
 */
export async function fetchBagObject(adresseerbaarObjectId: string): Promise<BagObject | null> {
  const key = process.env.BAG_API_KEY;
  if (!key || !adresseerbaarObjectId) return null;
  const url = `https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/verblijfsobjecten/${adresseerbaarObjectId}`;
  const res = await fetch(url, {
    headers: { 'X-Api-Key': key, accept: 'application/hal+json' },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    verblijfsobject?: {
      verblijfsobject?: {
        oppervlakte?: number;
        gebruiksdoelen?: string[];
        status?: string;
        maaktDeelUitVan?: string[];
      };
    };
  };
  const vo = json.verblijfsobject?.verblijfsobject;
  if (!vo) return null;
  const pandId = vo.maaktDeelUitVan?.[0];
  const bouwjaar = pandId ? await fetchPandBouwjaar(pandId, key) : null;
  return {
    bouwjaar,
    oppervlakte: vo.oppervlakte ?? null,
    gebruiksdoel: vo.gebruiksdoelen ?? [],
    status: vo.status ?? null,
  };
}

async function fetchPandBouwjaar(pandId: string, key: string): Promise<number | null> {
  const res = await fetch(`https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/panden/${pandId}`, {
    headers: { 'X-Api-Key': key, accept: 'application/hal+json' },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { pand?: { pand?: { oorspronkelijkBouwjaar?: string | number } } };
  const raw = json.pand?.pand?.oorspronkelijkBouwjaar;
  const year = typeof raw === 'string' ? Number(raw) : raw;
  return Number.isFinite(year) ? Number(year) : null;
}

/**
 * EP-Online (RVO) geeft het geregistreerde energielabel bij een adres.
 * Vereist EP_ONLINE_API_KEY.
 */
export async function fetchEpOnlineLabel(postcode: string, huisnummer: string): Promise<EpOnlineLabel | null> {
  const key = process.env.EP_ONLINE_API_KEY;
  if (!key) return null;
  const pc = postcode.replace(/\s+/g, '').toUpperCase();
  const url = `https://public.ep-online.nl/api/v5/PandEnergielabel/Adres?postcode=${encodeURIComponent(pc)}&huisnummer=${encodeURIComponent(huisnummer)}`;
  const res = await fetch(url, { headers: { Authorization: key, accept: 'application/json' }, next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const json = (await res.json()) as
    | { Labelletter?: string; Registratiedatum?: string; Geldig_tot?: string; Berekeningstype?: string }[]
    | null;
  const first = Array.isArray(json) ? json[0] : null;
  if (!first?.Labelletter) return null;
  return {
    label: first.Labelletter,
    registratiedatum: first.Registratiedatum ?? '',
    geldigTot: first.Geldig_tot ?? null,
    berekeningstype: first.Berekeningstype ?? null,
  };
}

/** Alles wat er over een adres op te halen valt, in één keer. */
export async function lookupAddress(postcode: string, huisnummer: string): Promise<LookupResult> {
  const unavailable: LookupResult['unavailable'] = [];
  const address = await lookupByPostcode(postcode, huisnummer);

  let bag: BagObject | null = null;
  if (!process.env.BAG_API_KEY) {
    unavailable.push({ source: 'BAG', reason: 'Geen BAG_API_KEY ingesteld, bouwjaar en oppervlakte zijn niet opgehaald.' });
  } else if (address?.adresseerbaarobject_id) {
    bag = await fetchBagObject(address.adresseerbaarobject_id);
    if (!bag) unavailable.push({ source: 'BAG', reason: 'Geen verblijfsobject gevonden bij dit adres.' });
  }

  let epOnline: EpOnlineLabel | null = null;
  if (!process.env.EP_ONLINE_API_KEY) {
    unavailable.push({ source: 'EP-Online', reason: 'Geen EP_ONLINE_API_KEY ingesteld, een bestaand label is niet gecontroleerd.' });
  } else {
    epOnline = await fetchEpOnlineLabel(postcode, huisnummer);
    if (!epOnline) unavailable.push({ source: 'EP-Online', reason: 'Geen geregistreerd label gevonden bij dit adres.' });
  }

  return { address, bag, epOnline, unavailable };
}
