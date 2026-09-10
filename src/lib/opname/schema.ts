/**
 * Opnameformulier NTA 8800 Woningen, ISSO 82.1.
 *
 * The fields below follow the official form (Opnameformulier NTA 8800 W,
 * versie 2024) section by section, with the answer options the form prints.
 * Only the basisopname set is here. Detailopname additionally asks for
 * Rc- and U-waarden per bouwdeel, lineaire koudebruggen, werkelijke
 * leidinglengtes and BCRG-codes from gecontroleerde kwaliteitsverklaringen,
 * which need bewijsstukken rather than an observation on site.
 */

export type Answer = string | number | boolean | null;
export type Values = Record<string, Answer>;

export interface Option {
  value: string;
  label: string;
}

/** A field or photo shows only when every condition holds. */
export interface Cond {
  field: string;
  in?: string[];
  notIn?: string[];
}

export interface Field {
  id: string;
  label: string;
  type: 'choice' | 'number' | 'text';
  options?: Option[];
  unit?: string;
  hint?: string;
  optional?: boolean;
  when?: Cond[];
  /** Column width hint for the table sections. */
  narrow?: boolean;
}

export interface PhotoReq {
  key: string;
  label: string;
  min: number;
  hint?: string;
  when?: Cond[];
}

export interface FormSection {
  kind: 'form';
  id: string;
  title: string;
  intro?: string;
  fields: Field[];
  photos?: PhotoReq[];
}

export type SeedKind = 'gevel' | 'dak' | 'vloer' | 'raam' | 'deur' | 'paneel';

export interface TableSection {
  kind: 'table';
  id: string;
  title: string;
  intro?: string;
  seed: SeedKind;
  columns: Field[];
  /** A basisopname is incomplete without at least this many rows. */
  minRows: number;
  photos?: PhotoReq[];
}

export type Section = FormSection | TableSection;

/* ---------- answer sets that repeat across the form ---------- */

const JANEE: Option[] = [
  { value: 'ja', label: 'Ja' },
  { value: 'nee', label: 'Nee' },
];

export const BEGRENZING: Option[] = [
  { value: 'B', label: 'Buitenlucht (B)' },
  { value: 'W', label: 'Water (W)' },
  { value: 'K', label: 'Kruipruimte (K)' },
  { value: 'G', label: 'Grond (G)' },
  { value: 'AOR', label: 'Aangrenzende onverwarmde ruimte (AOR)' },
  { value: 'AOS', label: 'Aangrenzende onverwarmde serre (AOS)' },
  { value: 'ASGR', label: 'Aangrenzend sterk geventileerde ruimte (ASGR)' },
];

export const ORIENTATIE: Option[] = [
  { value: 'N', label: 'Noord' },
  { value: 'NO', label: 'Noordoost' },
  { value: 'O', label: 'Oost' },
  { value: 'ZO', label: 'Zuidoost' },
  { value: 'Z', label: 'Zuid' },
  { value: 'ZW', label: 'Zuidwest' },
  { value: 'W', label: 'West' },
  { value: 'NW', label: 'Noordwest' },
  { value: 'H', label: 'Horizontaal' },
];

const ISOLATIE: Option[] = [
  { value: 'ja', label: 'Ja, bij de bouw' },
  { value: 'na', label: 'Nageïsoleerd' },
  { value: 'nee', label: 'Nee' },
  { value: 'onbekend', label: 'Onbekend' },
];

export const KOZIJN: Option[] = [
  { value: 'A', label: 'A. Hout of kunststof' },
  { value: 'B', label: 'B. Metaal, thermisch onderbroken' },
  { value: 'C', label: 'C. Metaal, niet thermisch onderbroken' },
];

export const GLAS: Option[] = [
  { value: 'A', label: 'A. Drievoudig HR-glas' },
  { value: 'B', label: 'B. HR++' },
  { value: 'C', label: 'C. HR+' },
  { value: 'D', label: 'D. Dubbelglas met emissieverlagende coating' },
  { value: 'E', label: 'E. Voorzetglas' },
  { value: 'F', label: 'F. Enkelglas of glas in lood' },
];

const ZONWERING: Option[] = [
  { value: 'geen', label: 'Geen zonwering' },
  { value: 'A', label: 'A. Uitvalscherm' },
  { value: 'B', label: 'B. Knikarmscherm' },
  { value: 'C1', label: 'C1. Screen zwart, antraciet of donkerbruin' },
  { value: 'C2', label: 'C2. Screen wit' },
  { value: 'C3', label: 'C3. Screen overige kleuren' },
  { value: 'C4', label: 'C4. Screen, kleur onbekend' },
  { value: 'D1', label: 'D1. Jaloezieën zwart, antraciet of donkerbruin' },
  { value: 'D2', label: 'D2. Jaloezieën wit' },
  { value: 'D3', label: 'D3. Jaloezieën overige kleuren' },
  { value: 'D4', label: 'D4. Jaloezieën, kleur onbekend' },
  { value: 'E1', label: 'E1. Aluminium rolluik wit' },
  { value: 'F2', label: 'F2. Aluminium rolluik overige kleuren' },
  { value: 'G', label: 'G. Gemetalliseerd weefsel, binnen toegepast' },
];

const LEIDINGLENGTE: Option[] = [
  { value: '<2', label: 'minder dan 2 m' },
  { value: '2-4', label: '2 tot 4 m' },
  { value: '4-6', label: '4 tot 6 m' },
  { value: '6-8', label: '6 tot 8 m' },
  { value: '8-10', label: '8 tot 10 m' },
  { value: '10-12', label: '10 tot 12 m' },
  { value: '12-14', label: '12 tot 14 m' },
  { value: '>=14', label: '14 m of meer' },
];

const ISOLATIEJAAR: Option[] = [
  { value: 'voor1980', label: 'Voor 1980 of onbekend' },
  { value: '1980-1995', label: '1980 tot 1995' },
  { value: 'vanaf1995', label: 'Vanaf 1995' },
];

/* ---------- the form ---------- */

export const SECTIONS: Section[] = [
  {
    kind: 'form',
    id: 'project',
    title: 'Algemene projectgegevens',
    intro: 'Waarvoor de energieprestatie wordt afgemeld en op welk niveau er is opgenomen.',
    fields: [
      {
        id: 'afmelding',
        label: 'Afmelding energieprestatie in verband met',
        type: 'choice',
        options: [
          { value: 'bestaand', label: 'Bestaand gebouw' },
          { value: 'vergunning', label: 'Aanvraag omgevingsvergunning' },
          { value: 'oplevering', label: 'Oplevering (vergunningsplichtig gebouw)' },
          { value: 'epv', label: 'Overeenkomen van een EPV' },
        ],
      },
      {
        id: 'niveau',
        label: 'Niveau opname',
        type: 'choice',
        options: [
          { value: 'basis', label: 'Basisopname' },
          { value: 'detail', label: 'Detailopname' },
        ],
        hint: 'Een detailopname vraagt daarnaast om Rc- en U-waarden per bouwdeel met bewijsstukken en om BCRG-codes. Die velden staan niet in deze opname.',
      },
      {
        id: 'opdrachtgever',
        label: 'Opdrachtgever',
        type: 'choice',
        options: [
          { value: 'particulier', label: 'Particuliere woningeigenaar' },
          { value: 'beheerder', label: 'Professionele woningbeheerder of verhuurder' },
          { value: 'particulierVerhuur', label: 'Particuliere verhuur' },
          { value: 'sociaal', label: 'Sociale verhuur' },
          { value: 'ontwikkelaar', label: 'Projectontwikkelaar' },
          { value: 'overig', label: 'Overig' },
        ],
      },
      {
        id: 'bron',
        label: 'Bron van de gebouwgegevens',
        type: 'choice',
        options: [
          { value: 'waarneming', label: 'Alleen door waarneming in het gebouw' },
          { value: 'waarnemingSchriftelijk', label: 'Waarneming in het gebouw samen met schriftelijke informatie van de opdrachtgever' },
        ],
      },
      {
        id: 'verklaringen',
        label: 'Is er gebruikgemaakt van gecontroleerde gelijkwaardigheids- of kwaliteitsverklaringen?',
        type: 'choice',
        options: JANEE,
      },
    ],
  },

  {
    kind: 'form',
    id: 'gebouw',
    title: 'Algemene gebouwgegevens',
    intro: 'Type woning, dakvorm en de maten die de rekenzone bepalen. Wat de scan al heeft gemeten staat ingevuld.',
    fields: [
      {
        id: 'gebouwtype',
        label: 'Gebouwtype',
        type: 'choice',
        options: [
          { value: 'vrijstaand', label: 'Vrijstaande woning' },
          { value: 'twee-onder-een-kap', label: 'Twee-onder-een-kapwoning' },
          { value: 'hoekwoning', label: 'Hoekwoning (rijwoning met hoekligging)' },
          { value: 'tussenwoning', label: 'Tussenwoning (rijwoning met tussenligging)' },
          { value: 'app-tussen-midden', label: 'Appartement tussen, midden' },
          { value: 'app-tussen-dak', label: 'Appartement tussen, dak' },
          { value: 'app-tussen-dak-vloer', label: 'Appartement tussen, dak en vloer' },
          { value: 'app-tussen-vloer', label: 'Appartement tussen, vloer' },
          { value: 'app-hoek-midden', label: 'Appartement hoek, midden' },
          { value: 'app-hoek-vloer', label: 'Appartement hoek, vloer' },
          { value: 'app-hoek-dak', label: 'Appartement hoek, dak' },
          { value: 'app-hoek-dak-vloer', label: 'Appartement hoek, dak en vloer' },
          { value: 'woonwagen', label: 'Woonwagen' },
          { value: 'woonboot', label: 'Woonboot met bestaande ligplaats' },
          { value: 'vakantiewoning', label: 'Vakantiewoning (niet in een woongebouw)' },
        ],
      },
      {
        id: 'typeDak',
        label: 'Type dak',
        type: 'choice',
        options: [
          { value: 'hellend', label: 'Hellend dak of puntdak' },
          { value: 'gedeeltelijkPlat', label: 'Gedeeltelijk plat dak (minimaal 50% plat, alleen bij vrijstaande woningen)' },
          { value: 'plat', label: 'Plat dak (geen kap)' },
        ],
      },
      { id: 'bouwjaar', label: 'Bouwjaar', type: 'number' },
      { id: 'renovatiejaar', label: 'Renovatiejaar', type: 'number', optional: true },
      { id: 'gebouwhoogte', label: 'Gebouwhoogte', type: 'number', unit: 'm' },
      { id: 'bouwlagen', label: 'Aantal bouwlagen van de woning', type: 'number' },
      { id: 'rekenzones', label: 'Aantal rekenzones', type: 'number' },
      { id: 'wooneenheden', label: 'Aantal wooneenheden', type: 'number' },
      {
        id: 'bouwwijzeVloeren',
        label: 'Specificatie van de bouwwijze, vloeren',
        type: 'choice',
        options: [
          { value: 'licht', label: 'Licht: houten, hsb- of sfb-vloeren, of aan de binnenzijde geïsoleerd' },
          { value: 'zwaar', label: 'Zwaar: staal-betonvloeren, kanaalplaat- of cassettevloeren' },
          { value: 'zeerzwaar', label: 'Zeer zwaar: massieve betonnen vloeren' },
        ],
      },
      {
        id: 'bouwwijzeWanden',
        label: 'Specificatie van de bouwwijze, wanden',
        type: 'choice',
        options: [
          { value: 'licht', label: 'Licht: hsb, sfb, staalskelet, of aan de binnenzijde geïsoleerd' },
          { value: 'zwaar', label: 'Zwaar: dragend metselwerk of een betonnen kolom-liggerconstructie' },
          { value: 'zeerzwaar', label: 'Zeer zwaar: betonnen wand-vloerskeletbouw' },
        ],
      },
      {
        id: 'qv10Gemeten',
        label: 'Infiltratie: is de qv;10-waarde gemeten?',
        type: 'choice',
        options: JANEE,
      },
      {
        id: 'qv10',
        label: 'Gemeten qv;10-waarde',
        type: 'number',
        unit: 'dm³/(s·m²)',
        when: [{ field: 'qv10Gemeten', in: ['ja'] }],
      },
      { id: 'agBouwlaag1', label: 'Gebruiksoppervlakte 1e bouwlaag', type: 'number', unit: 'm²' },
      { id: 'agBouwlaag2', label: 'Gebruiksoppervlakte 2e bouwlaag', type: 'number', unit: 'm²', optional: true },
      { id: 'agBouwlaag3', label: 'Gebruiksoppervlakte 3e bouwlaag', type: 'number', unit: 'm²', optional: true },
      { id: 'agBouwlaag4', label: 'Gebruiksoppervlakte 4e bouwlaag', type: 'number', unit: 'm²', optional: true },
      { id: 'agOverig', label: 'Gebruiksoppervlakte overige bouwlagen', type: 'number', unit: 'm²', optional: true },
    ],
    photos: [
      { key: 'voorgevel', label: 'Voorgevel, hele woning in beeld', min: 1 },
      { key: 'achtergevel', label: 'Achtergevel, hele woning in beeld', min: 1 },
      { key: 'zijgevel', label: 'Zijgevel', min: 1, when: [{ field: 'gebouwtype', in: ['vrijstaand', 'twee-onder-een-kap', 'hoekwoning'] }] },
      { key: 'meterkast', label: 'Meterkast met de aansluitingen', min: 1 },
      { key: 'hoogtemeting', label: 'Meting van de vrije hoogte', min: 1, hint: 'Meetlint of laser zichtbaar tegen vloer en plafond.' },
    ],
  },

  {
    kind: 'table',
    id: 'vloeren',
    title: 'Vloerconstructies',
    intro: 'Vloeren die grenzen aan een kruipruimte, de grond, buiten of een onverwarmde ruimte. Vloeren tussen twee verwarmde lagen tellen niet mee.',
    seed: 'vloer',
    minRows: 1,
    columns: [
      { id: 'naam', label: 'Naam bouwdeel', type: 'text' },
      { id: 'opp', label: 'Oppervlak', type: 'number', unit: 'm²', narrow: true },
      { id: 'begrenzing', label: 'Begrenzing', type: 'choice', options: BEGRENZING },
      {
        id: 'perimeter',
        label: 'Perimeter',
        type: 'number',
        unit: 'm',
        narrow: true,
        hint: 'De lengte van de rand van de vloer die aan grond, kruipruimte of water grenst.',
        when: [{ field: 'begrenzing', in: ['K', 'G', 'W'] }],
      },
      { id: 'isolatie', label: 'Vloerisolatie', type: 'choice', options: ISOLATIE },
      {
        id: 'dikte',
        label: 'Dikte isolatie',
        type: 'number',
        unit: 'mm',
        narrow: true,
        optional: true,
        hint: 'Leeg laten als de dikte niet te zien is; dan rekent NTA 8800 met het bouwjaar.',
        when: [{ field: 'isolatie', in: ['ja', 'na'] }],
      },
      { id: 'luchtspouw', label: 'Luchtspouw aanwezig', type: 'choice', options: JANEE, narrow: true },
      { id: 'thermokussen', label: 'Thermokussen', type: 'choice', options: JANEE, narrow: true },
    ],
    photos: [
      { key: 'vloer-onderzijde', label: 'Onderzijde van de vloer of de kruipruimte', min: 1 },
      {
        key: 'kruipluik',
        label: 'Kruipluik of toegang, met plaatsbepaling',
        min: 1,
        when: [{ field: 'kruipruimte', in: ['ja', 'niet-toegankelijk'] }],
      },
    ],
  },

  {
    kind: 'form',
    id: 'kruipruimte',
    title: 'Kruipruimte',
    fields: [
      {
        id: 'kruipruimte',
        label: 'Is er een kruipruimte?',
        type: 'choice',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'niet-toegankelijk', label: 'Wel aanwezig, niet toegankelijk' },
        ],
      },
      {
        id: 'kruipruimteBodem',
        label: 'Bodem kruipruimte',
        type: 'choice',
        options: [
          { value: 'geisoleerd', label: 'Bodem geïsoleerd' },
          { value: 'ongeisoleerd', label: 'Bodem ongeïsoleerd' },
        ],
        when: [{ field: 'kruipruimte', in: ['ja'] }],
      },
      {
        id: 'kruipruimteWater',
        label: 'Staat er water in de kruipruimte?',
        type: 'choice',
        options: JANEE,
        optional: true,
        when: [{ field: 'kruipruimte', in: ['ja'] }],
      },
    ],
  },

  {
    kind: 'form',
    id: 'rietendak',
    title: 'Rieten dak',
    fields: [
      { id: 'rietendak', label: 'Is er een rieten dak?', type: 'choice', options: JANEE },
      {
        id: 'rietDikte',
        label: 'Dikte rietpakket',
        type: 'number',
        unit: 'mm',
        when: [{ field: 'rietendak', in: ['ja'] }],
      },
      {
        id: 'rietIsolatie',
        label: 'Rieten dak geïsoleerd',
        type: 'choice',
        options: [
          { value: 'nee', label: 'Niet geïsoleerd' },
          { value: 'ja', label: 'Geïsoleerd' },
        ],
        when: [{ field: 'rietendak', in: ['ja'] }],
      },
      {
        id: 'rietIsolatieDikte',
        label: 'Dikte isolatie onder het riet',
        type: 'number',
        unit: 'mm',
        optional: true,
        when: [{ field: 'rietendak', in: ['ja'] }, { field: 'rietIsolatie', in: ['ja'] }],
      },
    ],
  },

  {
    kind: 'table',
    id: 'daken',
    title: 'Dakconstructies',
    intro: 'Elk dakvlak apart, met de helling en de richting waar het naartoe kijkt.',
    seed: 'dak',
    minRows: 1,
    columns: [
      { id: 'naam', label: 'Naam bouwdeel', type: 'text' },
      { id: 'opp', label: 'Oppervlak', type: 'number', unit: 'm²', narrow: true },
      { id: 'begrenzing', label: 'Begrenzing', type: 'choice', options: BEGRENZING },
      { id: 'hellingshoek', label: 'Hellingshoek', type: 'number', unit: '°', narrow: true },
      { id: 'orientatie', label: 'Oriëntatie', type: 'choice', options: ORIENTATIE, narrow: true },
      { id: 'isolatie', label: 'Dakisolatie', type: 'choice', options: ISOLATIE },
      {
        id: 'dikte',
        label: 'Dikte isolatie',
        type: 'number',
        unit: 'mm',
        narrow: true,
        optional: true,
        when: [{ field: 'isolatie', in: ['ja', 'na'] }],
      },
      { id: 'luchtspouw', label: 'Luchtspouw aanwezig', type: 'choice', options: JANEE, narrow: true },
    ],
    photos: [
      { key: 'dak-binnen', label: 'Dak van binnen, isolatie of dakbeschot zichtbaar', min: 1 },
      { key: 'dak-buiten', label: 'Dak van buiten', min: 1 },
    ],
  },

  {
    kind: 'table',
    id: 'gevels',
    title: 'Gevelconstructies',
    intro: 'De gesloten delen van de gevel, per oriëntatie. Ramen en deuren staan hieronder apart.',
    seed: 'gevel',
    minRows: 2,
    columns: [
      { id: 'naam', label: 'Naam bouwdeel', type: 'text' },
      { id: 'opp', label: 'Oppervlak', type: 'number', unit: 'm²', narrow: true },
      { id: 'begrenzing', label: 'Begrenzing', type: 'choice', options: BEGRENZING },
      { id: 'orientatie', label: 'Oriëntatie', type: 'choice', options: ORIENTATIE, narrow: true },
      { id: 'isolatie', label: 'Gevelisolatie', type: 'choice', options: ISOLATIE },
      {
        id: 'spouwvulling',
        label: 'Spouw gevuld',
        type: 'choice',
        options: [
          { value: 'ja', label: 'Ja, spouwvulling zichtbaar' },
          { value: 'nee', label: 'Nee, open spouw' },
          { value: 'geenspouw', label: 'Geen spouw (massieve muur)' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
      },
      {
        id: 'dikte',
        label: 'Dikte isolatie',
        type: 'number',
        unit: 'mm',
        narrow: true,
        optional: true,
        when: [{ field: 'isolatie', in: ['ja', 'na'] }],
      },
    ],
    photos: [
      { key: 'gevel-spouw', label: 'Spouw of gevelopbouw, bijvoorbeeld door een open stootvoeg of endoscoop', min: 1 },
      { key: 'gevel-detail', label: 'Aansluiting gevel op kozijn', min: 1 },
    ],
  },

  {
    kind: 'table',
    id: 'ramen',
    title: 'Ramen',
    intro: 'Elk raam met zijn oppervlak, kozijn en glassoort. Wat de rondscan aan raamopeningen heeft gevonden staat al ingevuld.',
    seed: 'raam',
    minRows: 1,
    columns: [
      { id: 'naam', label: 'Naam bouwdeel', type: 'text' },
      { id: 'opp', label: 'Oppervlak', type: 'number', unit: 'm²', narrow: true },
      { id: 'begrenzing', label: 'Begrenzing', type: 'choice', options: BEGRENZING },
      { id: 'orientatie', label: 'Oriëntatie', type: 'choice', options: ORIENTATIE, narrow: true },
      { id: 'kozijn', label: 'Type kozijn', type: 'choice', options: KOZIJN },
      { id: 'glas', label: 'Type glas', type: 'choice', options: GLAS },
      { id: 'zonwering', label: 'Type zonwering', type: 'choice', options: ZONWERING },
      {
        id: 'belemmering',
        label: 'Relatieve hoogte belemmering',
        type: 'number',
        narrow: true,
        optional: true,
        hint: 'Verhouding tussen de hoogte van de belemmering en de afstand ertoe. Leeg laten als er vrij zicht is.',
      },
    ],
    photos: [
      { key: 'glas-meting', label: 'Meting van de glasdikte of de ruitsticker', min: 1, hint: 'Een glasdiktemeter op de ruit, of het merk in de afstandhouder.' },
      { key: 'kozijn-detail', label: 'Kozijn van dichtbij', min: 1 },
    ],
  },

  {
    kind: 'table',
    id: 'deuren',
    title: 'Deuren',
    seed: 'deur',
    minRows: 1,
    columns: [
      { id: 'naam', label: 'Naam bouwdeel', type: 'text' },
      { id: 'opp', label: 'Oppervlak', type: 'number', unit: 'm²', narrow: true },
      { id: 'begrenzing', label: 'Begrenzing', type: 'choice', options: BEGRENZING },
      { id: 'orientatie', label: 'Oriëntatie', type: 'choice', options: ORIENTATIE, narrow: true },
      { id: 'kozijn', label: 'Type kozijn', type: 'choice', options: KOZIJN },
      {
        id: 'deur',
        label: 'Type deur',
        type: 'choice',
        options: [
          { value: 'A', label: 'A. Geïsoleerde deur' },
          { value: 'B', label: 'B. Ongeïsoleerde deur' },
        ],
      },
    ],
    photos: [{ key: 'voordeur', label: 'Voordeur', min: 1 }],
  },

  {
    kind: 'table',
    id: 'panelen',
    title: 'Paneelconstructies',
    intro: 'Dichte panelen die in een kozijn zitten, bijvoorbeeld onder een raam of naast de voordeur. Sla over als die er niet zijn.',
    seed: 'paneel',
    minRows: 0,
    columns: [
      { id: 'naam', label: 'Naam bouwdeel', type: 'text' },
      { id: 'opp', label: 'Oppervlak', type: 'number', unit: 'm²', narrow: true },
      { id: 'begrenzing', label: 'Begrenzing', type: 'choice', options: BEGRENZING },
      { id: 'orientatie', label: 'Oriëntatie', type: 'choice', options: ORIENTATIE, narrow: true },
      { id: 'kozijn', label: 'Type kozijn', type: 'choice', options: KOZIJN },
      { id: 'dikte', label: 'Dikte isolatie', type: 'number', unit: 'mm', narrow: true, optional: true },
    ],
  },

  {
    kind: 'form',
    id: 'leidingdoorvoeren',
    title: 'Leidingdoorvoeren',
    intro: 'Verticale leidingen die door de thermische schil gaan, bijvoorbeeld een standleiding door de begane grondvloer.',
    fields: [
      {
        id: 'leidingdoorvoeren',
        label: 'Leidingdoorvoeren',
        type: 'choice',
        options: [
          { value: 'nietAanwezig', label: 'Niet aanwezig' },
          { value: 'aanwezig', label: 'Aanwezig' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
      },
      {
        id: 'aantalLeidingen',
        label: 'Aantal verticale leidingen door de thermische schil',
        type: 'number',
        when: [{ field: 'leidingdoorvoeren', in: ['aanwezig'] }],
      },
      {
        id: 'aantalDoorvoeren',
        label: 'Aantal doorvoeren',
        type: 'number',
        when: [{ field: 'leidingdoorvoeren', in: ['aanwezig'] }],
      },
      {
        id: 'doorvoerBouwlagen',
        label: 'Aantal bouwlagen waardoor de leiding loopt',
        type: 'number',
        when: [{ field: 'leidingdoorvoeren', in: ['aanwezig'] }],
      },
      {
        id: 'doorvoerGeisoleerd',
        label: 'Leiding geïsoleerd',
        type: 'choice',
        options: JANEE,
        when: [{ field: 'leidingdoorvoeren', in: ['aanwezig'] }],
      },
    ],
  },

  {
    kind: 'form',
    id: 'verwarming',
    title: 'Ruimteverwarming',
    intro: 'Het toestel dat de woning verwarmt, hoe de warmte wordt rondgebracht en hoe hij wordt geregeld.',
    fields: [
      {
        id: 'typeVerwarming',
        label: 'Type verwarming',
        type: 'choice',
        options: [
          { value: 'individueel', label: 'Individueel systeem' },
          { value: 'collectief', label: 'Collectief systeem' },
          { value: 'extern', label: 'Externe warmtelevering' },
        ],
      },
      {
        id: 'opwekker1',
        label: '1e verwarmingstoestel',
        type: 'choice',
        options: [
          { value: 'hr107', label: 'HR107-ketel' },
          { value: 'hr104', label: 'HR104-ketel' },
          { value: 'hr100', label: 'HR100-ketel' },
          { value: 'vr', label: 'VR-ketel' },
          { value: 'cr', label: 'Conventionele ketel (CR) of moederhaard' },
          { value: 'crWaakvlam', label: 'Conventionele ketel met waakvlam' },
          { value: 'wpElektrisch', label: 'Elektrische warmtepomp' },
          { value: 'wpGas', label: 'Gaswarmtepomp' },
          { value: 'elektrisch', label: 'Elektrische verwarming' },
          { value: 'gaskachelMetAfvoer', label: 'Lokale gaskachel met afvoer' },
          { value: 'gaskachelZonderAfvoer', label: 'Lokale gaskachel zonder afvoer' },
          { value: 'oliekachelMetAfvoer', label: 'Lokale oliekachel met afvoer' },
          { value: 'oliekachelZonderAfvoer', label: 'Lokale oliekachel zonder afvoer' },
          { value: 'luchtverwarmer', label: 'Direct gestookte luchtverwarmer' },
          { value: 'wkk', label: 'WKK' },
          { value: 'biomassakachel', label: 'Biomassakachel' },
          { value: 'biomassaketel', label: 'Biomassaketel' },
          { value: 'extern', label: 'Externe warmtelevering (stadsverwarming)' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
      },
      { id: 'opwekker1Bouwjaar', label: 'Fabricagejaar 1e toestel', type: 'number', optional: true },
      {
        id: 'opwekker1Plaats',
        label: 'Plaats 1e toestel',
        type: 'choice',
        options: [
          { value: 'binnen', label: 'Binnen de thermische schil' },
          { value: 'buiten', label: 'Buiten de thermische schil' },
        ],
      },
      {
        id: 'wpMedium',
        label: 'Verwarmingsmedium warmtepomp',
        type: 'choice',
        options: [
          { value: 'water', label: 'Water' },
          { value: 'lucht', label: 'Lucht' },
        ],
        when: [{ field: 'opwekker1', in: ['wpElektrisch', 'wpGas'] }],
      },
      {
        id: 'wpBron',
        label: 'Bron warmtepomp',
        type: 'choice',
        options: [
          { value: 'buitenlucht', label: 'Buitenlucht' },
          { value: 'bodem', label: 'Bodem' },
          { value: 'grondwater', label: 'Grondwater of aquifer' },
          { value: 'retourlucht', label: 'Warmte uit retour- of afvoerlucht' },
          { value: 'paneel', label: 'Warmtepomppaneel' },
          { value: 'oppervlaktewater', label: 'Oppervlaktewater' },
        ],
        when: [{ field: 'opwekker1', in: ['wpElektrisch', 'wpGas'] }],
      },
      {
        id: 'wpVermogen',
        label: 'Nominaal vermogen warmtepomp',
        type: 'number',
        unit: 'kW',
        optional: true,
        when: [{ field: 'opwekker1', in: ['wpElektrisch', 'wpGas'] }],
      },
      {
        id: 'opwekker2',
        label: '2e verwarmingstoestel',
        type: 'choice',
        options: [
          { value: 'geen', label: 'Geen tweede toestel' },
          { value: 'hr107', label: 'HR107-ketel' },
          { value: 'wpElektrisch', label: 'Elektrische warmtepomp (hybride opstelling)' },
          { value: 'elektrisch', label: 'Elektrische verwarming' },
          { value: 'gaskachelMetAfvoer', label: 'Lokale gaskachel met afvoer' },
          { value: 'houtkachel', label: 'Houtkachel of inzethaard' },
          { value: 'pelletkachel', label: 'Pelletkachel' },
          { value: 'overig', label: 'Overig' },
        ],
      },
      {
        id: 'opwekker2Plaats',
        label: 'Plaats 2e toestel',
        type: 'choice',
        options: [
          { value: 'binnen', label: 'Binnen de thermische schil' },
          { value: 'buiten', label: 'Buiten de thermische schil' },
        ],
        when: [{ field: 'opwekker2', notIn: ['geen'] }],
      },
      {
        id: 'distributieMedium',
        label: 'Distributie van de warmte',
        type: 'choice',
        options: [
          { value: 'water', label: 'Door water' },
          { value: 'lucht', label: 'Door lucht' },
          { value: 'geen', label: 'Geen distributie (alleen lokale toestellen)' },
        ],
      },
      {
        id: 'aanvoertemperatuur',
        label: 'Temperatuurniveau aanvoer en retour',
        type: 'choice',
        options: [
          { value: '30/27', label: '30/27 °C' },
          { value: '35/30', label: '35/30 °C' },
          { value: '40/35', label: '40/35 °C' },
          { value: '45/40', label: '45/40 °C' },
          { value: '50/42', label: '50/42 °C' },
          { value: '55/47', label: '55/47 °C' },
          { value: '60/45', label: '60/45 °C' },
          { value: '65/55', label: '65/55 °C' },
          { value: '70/50', label: '70/50 °C' },
          { value: '75/65', label: '75/65 °C' },
          { value: '80/60', label: '80/60 °C' },
          { value: '90/70', label: '90/70 °C' },
        ],
        when: [{ field: 'distributieMedium', in: ['water'] }],
      },
      {
        id: 'pijpsysteem',
        label: 'Leidingsysteem',
        type: 'choice',
        options: [
          { value: 'twee', label: 'Tweepijpssysteem' },
          { value: 'een', label: 'Eenpijpsysteem' },
          { value: 'eenGerenoveerd', label: 'Gerenoveerd eenpijpsysteem' },
        ],
        when: [{ field: 'distributieMedium', in: ['water'] }],
      },
      {
        id: 'ingeregeld',
        label: 'Distributiesysteem waterzijdig ingeregeld',
        type: 'choice',
        options: [
          { value: 'onbekend', label: 'Onbekend of niet ingeregeld' },
          { value: 'ingeregeld', label: 'Ingeregeld volgens EN 14336 of gelijkwaardig' },
          { value: 'statisch', label: 'Statisch gebalanceerd' },
          { value: 'dynamisch', label: 'Dynamisch gebalanceerd' },
        ],
        when: [{ field: 'distributieMedium', in: ['water'] }],
      },
      {
        id: 'circulatiepomp',
        label: 'Circulatiepomp',
        type: 'choice',
        options: [
          { value: 'forfaitair', label: 'Forfaitair (vermogen onbekend)' },
          { value: 'bekend', label: 'Vermogen bekend' },
        ],
        when: [{ field: 'distributieMedium', in: ['water'] }],
      },
      {
        id: 'pompVermogen',
        label: 'Totaal vermogen pompen',
        type: 'number',
        unit: 'W',
        when: [{ field: 'circulatiepomp', in: ['bekend'] }],
      },
      {
        id: 'leidingenOnverwarmd',
        label: 'Verwarmingsleidingen door onverwarmde ruimten',
        type: 'choice',
        options: [
          { value: 'nee', label: 'Nee' },
          { value: 'ja', label: 'Ja' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'distributieMedium', in: ['water'] }],
      },
      {
        id: 'leidingenGeisoleerd',
        label: 'Zijn die leidingen geïsoleerd?',
        type: 'choice',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'leidingenOnverwarmd', in: ['ja'] }],
      },
      {
        id: 'leidingIsolatiejaar',
        label: 'Isolatiejaar leidingen',
        type: 'choice',
        options: ISOLATIEJAAR,
        when: [{ field: 'leidingenGeisoleerd', in: ['ja'] }],
      },
      {
        id: 'afgifte',
        label: 'Type afgiftesysteem',
        type: 'choice',
        options: [
          { value: 'radiatoren', label: 'Radiatoren' },
          { value: 'vloerverwarming', label: 'Vloerverwarming' },
          { value: 'radiatorenEnVloer', label: 'Radiatoren en vloerverwarming' },
          { value: 'convectoren', label: 'Ventilatorgedreven radiatoren of convectoren' },
          { value: 'luchtverwarming', label: 'Luchtverwarming' },
          { value: 'lokaal', label: 'Alleen lokale toestellen' },
        ],
      },
      {
        id: 'regeling',
        label: 'Regeling verwarming',
        type: 'choice',
        options: [
          { value: 'kamerthermostaat', label: 'Regeling in het hoofdvertrek (kamerthermostaat)' },
          { value: 'centraalMetNaregeling', label: 'Centrale regeling met naregeling per ruimte' },
          { value: 'perRuimte', label: 'Individuele regeling per ruimte' },
          { value: 'overig', label: 'Alle overige situaties en onbekend' },
        ],
      },
    ],
    photos: [
      {
        key: 'toestel-typeplaatje',
        label: 'Typeplaatje van het verwarmingstoestel',
        min: 1,
        hint: 'Merk, type en bouwjaar leesbaar.',
        when: [{ field: 'opwekker1', notIn: ['extern', 'onbekend'] }],
      },
      { key: 'toestel-opstelling', label: 'Het toestel in zijn opstelplaats', min: 1 },
      { key: 'afgifte', label: 'Afgiftesysteem: radiator, vloerverwarmingsverdeler of convector', min: 1 },
      { key: 'thermostaat', label: 'Thermostaat of regeling', min: 1 },
    ],
  },

  {
    kind: 'form',
    id: 'koeling',
    title: 'Ruimtekoeling',
    fields: [
      { id: 'koelingAanwezig', label: 'Is er koeling aanwezig in de rekenzone?', type: 'choice', options: JANEE },
      {
        id: 'koelInstallatie',
        label: 'Koelinstallatie',
        type: 'choice',
        options: [
          { value: 'individueel', label: 'Individueel' },
          { value: 'collectief', label: 'Collectief' },
          { value: 'extern', label: 'Externe koudelevering' },
        ],
        when: [{ field: 'koelingAanwezig', in: ['ja'] }],
      },
      {
        id: 'koelType',
        label: 'Type koeling',
        type: 'choice',
        options: [
          { value: 'splitAirco', label: 'Compressiekoeling, airconditioning (split)' },
          { value: 'wpKoeling', label: 'Actieve koeling via de warmtepomp' },
          { value: 'vrijeKoeling', label: 'Vrije of passieve koeling' },
          { value: 'absorptie', label: 'Absorptiekoeling' },
          { value: 'derden', label: 'Koudelevering door derden' },
        ],
        when: [{ field: 'koelingAanwezig', in: ['ja'] }],
      },
      {
        id: 'koelSplit',
        label: 'Uitvoering airconditioning',
        type: 'choice',
        options: [
          { value: 'single', label: 'Single-split' },
          { value: 'multi', label: 'Multi-split' },
        ],
        when: [{ field: 'koelType', in: ['splitAirco'] }],
      },
      {
        id: 'koelVermogen',
        label: 'Nominaal koelvermogen',
        type: 'number',
        unit: 'kW',
        optional: true,
        when: [{ field: 'koelingAanwezig', in: ['ja'] }],
      },
      {
        id: 'koelAfgifte',
        label: 'Afgiftesysteem koeling',
        type: 'choice',
        options: [
          { value: 'vloerWandPlafond', label: 'Vloer-, wand- of plafondkoeling' },
          { value: 'ventilatorconvector', label: 'Ventilatorconvector' },
          { value: 'overig', label: 'Alle overige situaties of onbekend' },
        ],
        when: [{ field: 'koelingAanwezig', in: ['ja'] }],
      },
      {
        id: 'koelRegeling',
        label: 'Regeling koeling',
        type: 'choice',
        options: [
          { value: 'standalone', label: 'Standalone regeling' },
          { value: 'centraal', label: 'Centrale regeling' },
          { value: 'overig', label: 'Alle overige situaties en onbekend' },
        ],
        when: [{ field: 'koelingAanwezig', in: ['ja'] }],
      },
    ],
    photos: [
      { key: 'koeling-buitenunit', label: 'Buitenunit van de koeling', min: 1, when: [{ field: 'koelingAanwezig', in: ['ja'] }] },
      { key: 'koeling-binnenunit', label: 'Binnenunit met typeplaatje', min: 1, when: [{ field: 'koelingAanwezig', in: ['ja'] }] },
    ],
  },

  {
    kind: 'form',
    id: 'ventilatie',
    title: 'Ventilatie',
    intro: 'Het systeemtype bepaalt een groot deel van de uitkomst. Kies de code die past bij wat je in de woning ziet.',
    fields: [
      {
        id: 'ventilatieSysteem',
        label: 'Ventilatiesysteem',
        type: 'choice',
        options: [
          { value: 'individueel', label: 'Individueel' },
          { value: 'collectief', label: 'Collectief' },
        ],
      },
      {
        id: 'ventilatietype',
        label: 'Ventilatievoorziening',
        type: 'choice',
        options: [
          { value: 'A.1', label: 'A.1 Natuurlijke toe- en afvoer, standaard' },
          { value: 'A.2a', label: 'A.2a Natuurlijk, luchtdrukgestuurde toevoer Δp ≤ 1 Pa' },
          { value: 'A.2b', label: 'A.2b Natuurlijk, luchtdrukgestuurde toevoer 1 < Δp ≤ 5 Pa' },
          { value: 'A.2c', label: 'A.2c Natuurlijk, luchtdrukgestuurde toevoer 5 < Δp ≤ 10 Pa, of roostertype onbekend met zelfregelende klep' },
          { value: 'B.1', label: 'B.1 Mechanische toevoer, standaard' },
          { value: 'B.2', label: 'B.2 Mechanische toevoer, tijdsturing zonder zonering' },
          { value: 'B.3', label: 'B.3 Mechanische toevoer, CO₂-sturing per verblijfsruimte met zonering' },
          { value: 'C.1', label: 'C.1 Mechanische afvoer, standaard' },
          { value: 'C.2a', label: 'C.2a Mechanische afvoer, luchtdrukgestuurde toevoer Δp ≤ 1 Pa' },
          { value: 'C.2b', label: 'C.2b Mechanische afvoer, luchtdrukgestuurde toevoer 1 < Δp ≤ 5 Pa' },
          { value: 'C.2c', label: 'C.2c Mechanische afvoer, luchtdrukgestuurde toevoer 5 < Δp ≤ 10 Pa' },
          { value: 'C.3a', label: 'C.3a Mechanische afvoer met tijdsturing, zonder zonering' },
          { value: 'C.3b', label: 'C.3b Luchtdrukgestuurde toevoer Δp ≤ 1 Pa, tijdsturing afvoer, zonder zonering' },
          { value: 'C.3c', label: 'C.3c Tijdsturing toevoer, afvoer zonder zonering' },
          { value: 'C.4a', label: 'C.4a CO₂-sturing afvoer in de woonkamer, zonder zonering' },
          { value: 'C.4b', label: 'C.4b CO₂-sturing toe- en afvoer in woonkamer en hoofdslaapkamer, zonder zonering' },
          { value: 'C.4c', label: 'C.4c CO₂-sturing afvoer in woonkamer en hoofdslaapkamer, zonder zonering' },
          { value: 'C.5a', label: 'C.5a CO₂-sturing afvoer in woonkamer en hoofdslaapkamer, met zonering' },
          { value: 'C.5b', label: 'C.5b Als C.5a, met afzonderlijke afvoerpunten per verblijfsruimte' },
          { value: 'D.1', label: 'D.1 Balansventilatie zonder WTW, handbediend' },
          { value: 'D.2', label: 'D.2 Centrale WTW zonder zonering en zonder sturing' },
          { value: 'D.3', label: 'D.3 Centrale WTW, CO₂-sturing in de woonkamer, zonder zonering' },
          { value: 'D.4a', label: 'D.4a Balansventilatie met tijdsturing, zonder zonering' },
          { value: 'D.4b', label: 'D.4b Balansventilatie met tijdsturing, met zonering' },
          { value: 'D.5a', label: 'D.5a CO₂-sturing in woonkamer en hoofdslaapkamer, met zonering' },
          { value: 'D.5b', label: 'D.5b Decentrale WTW, CO₂-sturing met zonering' },
          { value: 'D.5c', label: 'D.5c Centrale WTW, CO₂-sturing zonder zonering' },
          { value: 'E.1', label: 'E.1 Gecombineerd systeem' },
        ],
      },
      {
        id: 'wtw',
        label: 'Warmteterugwinning',
        type: 'choice',
        options: [
          { value: 'nee', label: 'Niet aanwezig' },
          { value: 'ja', label: 'Aanwezig' },
        ],
      },
      {
        id: 'wtwType',
        label: 'Type warmtewisselaar',
        type: 'choice',
        options: [
          { value: 'tegenstroomAluminium', label: 'Tegenstroomwarmtewisselaar, aluminium' },
          { value: 'tegenstroomKunststof', label: 'Tegenstroomwarmtewisselaar, kunststof' },
          { value: 'tegenstroomOnbekend', label: 'Tegenstroomwarmtewisselaar, materiaal onbekend' },
          { value: 'kruisstroom', label: 'Kruisstroomwarmtewisselaar' },
          { value: 'platenBuizen', label: 'Platen- of buizenwarmtewisselaar' },
          { value: 'tweeElementen', label: 'Twee-elementensysteem' },
          { value: 'heatpipe', label: 'Warmtebuisapparaat (heat pipe)' },
          { value: 'roterend', label: 'Langzaam roterende of intermitterende warmtewisselaar' },
          { value: 'enthalpie', label: 'Enthalpiewisselaar' },
        ],
        when: [{ field: 'wtw', in: ['ja'] }],
      },
      {
        id: 'bypass',
        label: 'Bypass aanwezig',
        type: 'choice',
        options: [
          { value: 'nee', label: 'Nee' },
          { value: 'jaVolledig', label: 'Ja, volledige bypass' },
          { value: 'jaGedeeltelijk', label: 'Ja, gedeeltelijke bypass' },
        ],
        when: [{ field: 'wtw', in: ['ja'] }],
      },
      {
        id: 'ventilatorVermogen',
        label: 'Ventilatorvermogen',
        type: 'choice',
        options: [
          { value: 'forfaitair', label: 'Forfaitair (niet af te lezen)' },
          { value: 'nominaal', label: 'Nominaal vermogen bekend' },
        ],
        when: [{ field: 'ventilatietype', notIn: ['A.1', 'A.2a', 'A.2b', 'A.2c'] }],
      },
      {
        id: 'ventilatorWatt',
        label: 'Nominaal vermogen ventilator',
        type: 'number',
        unit: 'W',
        when: [{ field: 'ventilatorVermogen', in: ['nominaal'] }],
      },
      {
        id: 'ventilatorJaar',
        label: 'Fabricagejaar ventilator',
        type: 'choice',
        options: [
          { value: '<1980', label: 'Voor 1980' },
          { value: '1980-1985', label: '1980 tot en met 1985' },
          { value: '1985-1990', label: '1985 tot en met 1990' },
          { value: '1990-1998', label: '1990 tot en met 1998' },
          { value: '1998-2006', label: '1998 tot en met 2006' },
          { value: '>2006', label: 'Na 2006' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'ventilatietype', notIn: ['A.1', 'A.2a', 'A.2b', 'A.2c'] }],
      },
      {
        id: 'debiet',
        label: 'Ventilatiedebiet',
        type: 'choice',
        options: [
          { value: 'onbekend', label: 'Onbekend' },
          { value: 'bekend', label: 'Bekend' },
        ],
        when: [{ field: 'ventilatietype', notIn: ['A.1', 'A.2a', 'A.2b', 'A.2c'] }],
      },
      {
        id: 'debietWaarde',
        label: 'Gemeten of opgegeven debiet',
        type: 'number',
        unit: 'm³/h',
        when: [{ field: 'debiet', in: ['bekend'] }],
      },
      {
        id: 'spuivoorziening',
        label: 'Zijn er te openen ramen of deuren in elke verblijfsruimte (spuivoorziening)?',
        type: 'choice',
        options: JANEE,
      },
    ],
    photos: [
      {
        key: 'ventilatie-unit',
        label: 'Ventilatie-unit of afzuigbox met typeplaatje',
        min: 1,
        when: [{ field: 'ventilatietype', notIn: ['A.1', 'A.2a', 'A.2b', 'A.2c'] }],
      },
      { key: 'ventilatie-rooster', label: 'Toevoerrooster in de gevel of het kozijn', min: 1 },
      {
        key: 'ventilatie-regeling',
        label: 'Bediening of CO₂-sensor',
        min: 1,
        when: [{ field: 'ventilatietype', notIn: ['A.1', 'A.2a', 'A.2b', 'A.2c'] }],
      },
    ],
  },

  {
    kind: 'form',
    id: 'tapwater',
    title: 'Warm tapwater',
    intro: 'Het toestel dat het warme water maakt, het vat, de leidinglengtes naar keuken en badkamer en de douchewarmteterugwinning.',
    fields: [
      {
        id: 'tapwaterSysteem',
        label: 'Tapwatersysteem',
        type: 'choice',
        options: [
          { value: 'individueel', label: 'Individueel' },
          { value: 'collectief', label: 'Gemeenschappelijk of collectief' },
          { value: 'afleverset', label: 'Warmtelevering via een afleverset' },
        ],
      },
      {
        id: 'tapwaterOpwekker',
        label: 'Opwekker warm tapwater',
        type: 'choice',
        options: [
          { value: 'combiketel', label: 'Combitoestel, hetzelfde toestel als de verwarming' },
          { value: 'combiWkk', label: 'Combitoestel met microWKK' },
          { value: 'geiser', label: 'Keukengeiser' },
          { value: 'gasboiler', label: 'Gasgestookt voorraadvat (gasboiler)' },
          { value: 'elektroboiler', label: 'Elektroboiler' },
          { value: 'doorstroom', label: 'Elektrisch doorstroomtoestel' },
          { value: 'wpBoiler', label: 'Warmtepompboiler' },
          { value: 'boosterWp', label: 'Booster-warmtepomp' },
          { value: 'indirectVat', label: 'Indirect verwarmd voorraadvat' },
          { value: 'afleverset', label: 'Afleverset stadsverwarming' },
          { value: 'biomassa', label: 'Vaste biomassa' },
        ],
      },
      {
        id: 'gaskeur',
        label: 'Gaskeur van het gastoestel',
        type: 'choice',
        options: [
          { value: 'geen', label: 'Geen Gaskeur' },
          { value: 'gaskeur', label: 'Gaskeur' },
          { value: 'gaskeurCw', label: 'Gaskeur CW' },
        ],
        when: [{ field: 'tapwaterOpwekker', in: ['combiketel', 'combiWkk', 'gasboiler', 'geiser'] }],
      },
      {
        id: 'cwKlasse',
        label: 'CW-klasse',
        type: 'choice',
        options: [
          { value: 'cw1', label: 'Aanrechtgebruik, CW-1 of CW-1+' },
          { value: 'cw2', label: 'CW-2' },
          { value: 'cw3', label: 'CW-3' },
          { value: 'cw456', label: 'CW-4, CW-5, CW-6 of onbekend' },
        ],
        when: [{ field: 'gaskeur', in: ['gaskeurCw'] }],
      },
      {
        id: 'wpBoilerBron',
        label: 'Bron warmtepompboiler',
        type: 'choice',
        options: [
          { value: 'retourluchtMet', label: 'Ventilatieretourlucht met overventilatie' },
          { value: 'retourluchtZonder', label: 'Ventilatieretourlucht zonder overventilatie' },
          { value: 'overig', label: 'Overige bronnen' },
          { value: 'onbekend', label: 'Onbekende bron' },
        ],
        when: [{ field: 'tapwaterOpwekker', in: ['wpBoiler'] }],
      },
      { id: 'voorraadvat', label: 'Is er een voorraadvat aanwezig?', type: 'choice', options: JANEE },
      { id: 'vatVolume', label: 'Volume vat', type: 'number', unit: 'l', when: [{ field: 'voorraadvat', in: ['ja'] }] },
      {
        id: 'vatPlaats',
        label: 'Opstelplaats vat',
        type: 'choice',
        options: [
          { value: 'binnen', label: 'Binnen de thermische schil' },
          { value: 'buiten', label: 'Buiten de thermische schil' },
        ],
        when: [{ field: 'voorraadvat', in: ['ja'] }],
      },
      {
        id: 'vatAansluitwijze',
        label: 'Aansluitwijze vat',
        type: 'choice',
        options: [
          { value: '1', label: '1. Vier of meer aansluitingen, T-stukken en kleppen geïsoleerd' },
          { value: '2', label: '2. Vier aansluitingen, alleen rechte delen geïsoleerd, geen heat trap' },
          { value: '3', label: '3. Als 2, maar met meer dan vier aansluitingen' },
          { value: '4', label: '4. Ongeïsoleerd of onbekend' },
        ],
        when: [{ field: 'voorraadvat', in: ['ja'] }],
      },
      {
        id: 'vatLabel',
        label: 'Energielabel voorraadvat',
        type: 'choice',
        options: [
          { value: 'A+', label: 'A+' },
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' },
          { value: 'E', label: 'E' },
          { value: 'F', label: 'F' },
          { value: 'G', label: 'G' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'voorraadvat', in: ['ja'] }],
      },
      { id: 'aantalBadkamers', label: 'Aantal badkamers', type: 'number' },
      { id: 'aantalKeukens', label: 'Aantal keukens', type: 'number' },
      { id: 'leidingKeuken', label: 'Leidinglengte naar de keuken', type: 'choice', options: LEIDINGLENGTE },
      { id: 'leidingBadkamer', label: 'Leidinglengte naar de badkamer', type: 'choice', options: LEIDINGLENGTE },
      {
        id: 'circulatieleiding',
        label: 'Is er een circulatieleiding?',
        type: 'choice',
        options: JANEE,
      },
      {
        id: 'circulatieGeisoleerd',
        label: 'Circulatieleiding geïsoleerd',
        type: 'choice',
        options: [
          { value: 'ja', label: 'Geïsoleerd' },
          { value: 'nee', label: 'Niet geïsoleerd' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'circulatieleiding', in: ['ja'] }],
      },
      { id: 'dwtw', label: 'Is er douchewarmteterugwinning?', type: 'choice', options: JANEE },
      { id: 'aantalDouches', label: 'Aantal douches', type: 'number' },
      {
        id: 'dwtwAantal',
        label: 'Aantal douches aangesloten op een DWTW',
        type: 'number',
        when: [{ field: 'dwtw', in: ['ja'] }],
      },
      {
        id: 'dwtwType',
        label: 'Type DWTW',
        type: 'choice',
        options: [
          { value: 'verticaal', label: 'Verticale DWTW' },
          { value: 'horizontaal', label: 'Horizontale DWTW' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'dwtw', in: ['ja'] }],
      },
      {
        id: 'dwtwAansluiting',
        label: 'Aansluitwijze DWTW',
        type: 'choice',
        options: [
          { value: 'koudepoort', label: 'Aan de koudepoort van de mengkraan van de douche' },
          { value: 'inlaat', label: 'Aan de inlaat van het toestel voor warmtapwaterbereiding' },
          { value: 'beide', label: 'Aan beide' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'dwtw', in: ['ja'] }],
      },
    ],
    photos: [
      { key: 'tapwater-toestel', label: 'Tapwatertoestel of voorraadvat met typeplaatje', min: 1 },
      { key: 'tapwater-keuken', label: 'Warmwatertappunt in de keuken', min: 1 },
      { key: 'tapwater-douche', label: 'Douche', min: 1 },
      { key: 'dwtw', label: 'Douchewarmteterugwinning, unit of goot', min: 1, when: [{ field: 'dwtw', in: ['ja'] }] },
    ],
  },

  {
    kind: 'form',
    id: 'opwekking',
    title: 'Gebouwgebonden energieproductie',
    intro: 'Zonnepanelen, zonneboiler of windenergie op het perceel.',
    fields: [
      { id: 'pv', label: 'Zijn er PV-panelen?', type: 'choice', options: JANEE },
      { id: 'pvAantal', label: 'Aantal PV-panelen', type: 'number', when: [{ field: 'pv', in: ['ja'] }] },
      { id: 'pvOppPerPaneel', label: 'Oppervlak per paneel', type: 'number', unit: 'm²', when: [{ field: 'pv', in: ['ja'] }] },
      {
        id: 'pvCel',
        label: 'Type fotovoltaïsche cel',
        type: 'choice',
        options: [
          { value: 'mono', label: 'Monokristallijn' },
          { value: 'poly', label: 'Multikristallijn (polykristallijn) of onbekend' },
          { value: 'amorf', label: 'Amorf silicium, enkelvoudige junctie' },
          { value: 'multijunctie', label: 'Multi-junctie op amorf silicium' },
          { value: 'cigs', label: 'Koper-indium/gallium-diselenide' },
          { value: 'cdte', label: 'Cadmiumtelluride' },
        ],
        when: [{ field: 'pv', in: ['ja'] }],
      },
      {
        id: 'pvInstallatiejaar',
        label: 'Installatiejaar PV',
        type: 'choice',
        options: [
          { value: '<2001', label: 'Voor 2001' },
          { value: '2001-2010', label: '2001 tot en met 2010' },
          { value: '2011-2014', label: '2011 tot en met 2014' },
          { value: '2015-2017', label: '2015 tot en met 2017' },
          { value: '>=2018', label: 'Vanaf 2018' },
        ],
        when: [{ field: 'pv', in: ['ja'] }],
      },
      {
        id: 'pvIntegratie',
        label: 'Bouwintegratie PV-paneel',
        type: 'choice',
        options: [
          { value: 'nietGeventileerd', label: 'Niet geventileerd' },
          { value: 'matig', label: 'Matig geventileerd' },
          { value: 'sterk', label: 'Sterk geventileerd' },
          { value: 'onbekend', label: 'Onbekend' },
        ],
        when: [{ field: 'pv', in: ['ja'] }],
      },
      { id: 'pvHelling', label: 'Hellingshoek PV', type: 'number', unit: '°', when: [{ field: 'pv', in: ['ja'] }] },
      { id: 'pvOrientatie', label: 'Oriëntatie PV', type: 'choice', options: ORIENTATIE, when: [{ field: 'pv', in: ['ja'] }] },
      {
        id: 'pvBelemmering',
        label: 'Relatieve hoogte belemmering PV',
        type: 'number',
        optional: true,
        when: [{ field: 'pv', in: ['ja'] }],
      },
      { id: 'zonneboiler', label: 'Is er een zonneboiler of PVT-systeem?', type: 'choice', options: JANEE },
      {
        id: 'zbCollectorOpp',
        label: 'Collectoroppervlakte',
        type: 'number',
        unit: 'm²',
        when: [{ field: 'zonneboiler', in: ['ja'] }],
      },
      {
        id: 'zbType',
        label: 'Type collector',
        type: 'choice',
        options: [
          { value: 'beglaasd', label: 'Beglaasde of afgedekte collector, of onbekend' },
          { value: 'onbeglaasd', label: 'Niet-beglaasde of niet-afgedekte collector' },
          { value: 'vacuum', label: 'Vacuümbuiscollector' },
        ],
        when: [{ field: 'zonneboiler', in: ['ja'] }],
      },
      {
        id: 'zbVat',
        label: 'Volume opslagvat',
        type: 'number',
        unit: 'l',
        when: [{ field: 'zonneboiler', in: ['ja'] }],
      },
      {
        id: 'zbOrientatie',
        label: 'Oriëntatie collector',
        type: 'choice',
        options: ORIENTATIE,
        when: [{ field: 'zonneboiler', in: ['ja'] }],
      },
      {
        id: 'zbHelling',
        label: 'Hellingshoek collector',
        type: 'number',
        unit: '°',
        when: [{ field: 'zonneboiler', in: ['ja'] }],
      },
      { id: 'wind', label: 'Is er windenergie op het perceel?', type: 'choice', options: JANEE },
      {
        id: 'windVerklaring',
        label: 'Is er een kwaliteitsverklaring voor de windturbine?',
        type: 'choice',
        options: JANEE,
        hint: 'Zonder verklaring mag windenergie niet in de berekening worden meegenomen.',
        when: [{ field: 'wind', in: ['ja'] }],
      },
    ],
    photos: [
      { key: 'pv-panelen', label: 'PV-panelen op het dak', min: 1, when: [{ field: 'pv', in: ['ja'] }] },
      { key: 'pv-omvormer', label: 'Omvormer met typeplaatje', min: 1, when: [{ field: 'pv', in: ['ja'] }] },
      { key: 'zonneboiler', label: 'Zonnecollector en het vat', min: 1, when: [{ field: 'zonneboiler', in: ['ja'] }] },
    ],
  },
];

export const SECTION_IDS = SECTIONS.map((s) => s.id);

export function sectionById(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}
