import type { Property } from '@/lib/types';

/**
 * Seed portfolio. Monsmastate and Skuorre carry the figures from the real
 * meetrapport; the rest are representative records for the other lifecycle states.
 */
export const SEED_PROPERTIES: Property[] = [
  {
    id: 'monsmastate',
    address: 'Monsmastate 22',
    city: 'Leeuwarden',
    postcode: '8926 RK',
    type: 'Tussenwoning',
    year: 1998,
    photoCount: 96,
    label: 'B',
    energyIndex: 1.18,
    lifecycle: 'interactive',
    assignedTo: 'sanne',
    meetrapport: { naam: 'Melvin Krikke', bedrijf: 'Krik je energielabel op', inmeetdatum: '09-06-2026', gow: 132, bi: 520 },
    floors: [
      {
        name: 'Begane grond',
        rooms: [
          { name: 'Woonkamer', area: 29.6 }, { name: 'Keuken', area: 10.8 }, { name: 'Bijkeuken', area: 5.1 },
          { name: 'Entree', area: 6.4 }, { name: 'Toilet', area: 1.2 }, { name: 'Garage', area: 17.3 },
        ],
      },
      {
        name: 'Eerste verdieping',
        rooms: [
          { name: 'Slaapkamer', area: 12.7 }, { name: 'Slaapkamer', area: 12.6 }, { name: 'Slaapkamer', area: 7.4 },
          { name: 'Slaapkamer', area: 7.4 }, { name: 'Badkamer', area: 4.7 }, { name: 'Inloopkast', area: 3.8 },
          { name: 'Overloop', area: 6.5 },
        ],
      },
      { name: 'Tweede verdieping', rooms: [{ name: 'Zolder', area: 21.2 }] },
      { name: 'Overkapping', rooms: [{ name: 'Overkapping', area: 8.0 }] },
    ],
    runtime: { mode: 'both', processed: true, processing: false },
  },
  {
    id: 'skuorre',
    address: 'Skuorre 16',
    city: 'Leeuwarden',
    postcode: '8925 AA',
    type: 'Vrijstaande woning',
    year: 2005,
    photoCount: 112,
    label: 'A',
    energyIndex: 0.92,
    lifecycle: 'interactive',
    assignedTo: 'melvin',
    meetrapport: { naam: 'Melvin Krikke', bedrijf: 'Krik je energielabel op', inmeetdatum: '09-06-2026', gow: 132.82, bi: 497 },
    floors: [
      {
        name: 'Begane grond',
        rooms: [
          { name: 'Woonkamer', area: 34.6 }, { name: 'Keuken', area: 10.3 }, { name: 'Kast', area: 2.2 },
          { name: 'Entree', area: 8.7 }, { name: 'Toilet', area: 1.1 },
        ],
      },
      {
        name: 'Eerste verdieping',
        rooms: [
          { name: 'Slaapkamer', area: 12.0 }, { name: 'Slaapkamer', area: 11.8 }, { name: 'Slaapkamer', area: 6.4 },
          { name: 'Badkamer', area: 5.1 }, { name: 'Overloop', area: 6.6 },
        ],
      },
      { name: 'Tweede verdieping', rooms: [{ name: 'Slaapkamer', area: 24.3 }, { name: 'Kast', area: 3.0 }, { name: 'Kast', area: 1.1 }] },
      { name: 'Berging', rooms: [{ name: 'Berging', area: 6.8 }, { name: 'Berging', area: 1.6 }] },
    ],
    runtime: { mode: 'both', processed: true, processing: false },
  },
  {
    id: 'fonteinstraat',
    address: 'Fonteinstraat 8',
    city: 'Leeuwarden',
    postcode: '8913 CV',
    type: 'Hoekwoning',
    year: 2001,
    photoCount: 88,
    label: 'B',
    energyIndex: 1.24,
    lifecycle: 'done',
    fixedMode: 'both',
    assignedTo: 'bram',
    meetrapport: { naam: 'Melvin Krikke', bedrijf: 'Krik je energielabel op', inmeetdatum: '14-03-2026', gow: 100, bi: 385 },
    signoff: { adviseur: 'Ir. Sietske Boonstra', conceptdatum: '19-03-2026', datum: '22-03-2026', epOnlineId: 'EP-2026-441027' },
    floors: [
      {
        name: 'Begane grond',
        rooms: [
          { name: 'Woonkamer', area: 26 }, { name: 'Keuken', area: 11 }, { name: 'Hal & toilet', area: 7 },
          { name: 'Bijkeuken', area: 5 }, { name: 'Berging', area: 10 },
        ],
      },
      {
        name: '1e verdieping',
        rooms: [
          { name: 'Slaapkamer 1', area: 14 }, { name: 'Slaapkamer 2', area: 11 }, { name: 'Slaapkamer 3', area: 8 },
          { name: 'Badkamer', area: 6 }, { name: 'Overloop', area: 10 },
        ],
      },
    ],
  },
  {
    id: 'vansminiaweg',
    address: 'Van Sminiaweg 45',
    city: 'Burgum',
    postcode: '9251 GT',
    type: 'Twee-onder-een-kap',
    year: 2019,
    photoCount: 104,
    label: 'A',
    energyIndex: 0.68,
    lifecycle: 'done',
    fixedMode: 'both',
    assignedTo: 'sanne',
    meetrapport: { naam: 'Melvin Krikke', bedrijf: 'Krik je energielabel op', inmeetdatum: '02-05-2026', gow: 113, bi: 441 },
    signoff: { adviseur: 'Ing. Douwe Postma', conceptdatum: '08-05-2026', datum: '11-05-2026', epOnlineId: 'EP-2026-448192' },
    floors: [
      {
        name: 'Begane grond',
        rooms: [
          { name: 'Woonkamer', area: 32.4 }, { name: 'Keuken', area: 12.6 }, { name: 'Entree', area: 5.8 },
          { name: 'Toilet', area: 2.1 }, { name: 'Bijkeuken', area: 6.2 },
        ],
      },
      {
        name: 'Eerste verdieping',
        rooms: [
          { name: 'Slaapkamer 1', area: 16.4 }, { name: 'Slaapkamer 2', area: 12.8 }, { name: 'Slaapkamer 3', area: 10.2 },
          { name: 'Badkamer', area: 7.5 }, { name: 'Overloop', area: 8.0 }, { name: 'Inloopkast', area: 4.6 },
        ],
      },
    ],
  },
  {
    id: 'easterdyk',
    address: 'Easterdyk 7',
    city: 'Grou',
    postcode: '9001 AE',
    type: 'Tussenwoning',
    year: 1988,
    photoCount: 62,
    label: 'C',
    energyIndex: 1.38,
    lifecycle: 'done',
    fixedMode: 'both',
    assignedTo: 'melvin',
    ownerId: 'vgf',
    ownerName: 'Vastgoedbeheer Fryslân B.V.',
    meetrapport: { naam: 'Melvin Krikke', bedrijf: 'Krik je energielabel op', inmeetdatum: '19-01-2026', gow: 94, bi: 348 },
    signoff: { adviseur: 'Ir. Sietske Boonstra', conceptdatum: '25-01-2026', datum: '28-01-2026', epOnlineId: 'EP-2026-429815' },
    floors: [
      { name: 'Begane grond', rooms: [{ name: 'Woonkamer', area: 24.5 }, { name: 'Keuken', area: 9.8 }, { name: 'Hal & toilet', area: 6.0 }, { name: 'Berging', area: 8.4 }] },
      { name: 'Eerste verdieping', rooms: [{ name: 'Slaapkamer 1', area: 13.2 }, { name: 'Slaapkamer 2', area: 10.6 }, { name: 'Badkamer', area: 5.4 }, { name: 'Overloop', area: 7.1 }] },
      { name: 'Tweede verdieping', rooms: [{ name: 'Zolder', area: 18.6 }] },
    ],
  },
  {
    id: 'dekamp',
    address: 'De Kamp 14',
    city: 'Dokkum',
    postcode: '9101 XL',
    type: 'Vrijstaande woning',
    year: 1995,
    photoCount: 74,
    label: 'C',
    energyIndex: 1.46,
    lifecycle: 'ready',
    fixedMode: 'label',
    assignedTo: 'femke',
    ownerId: 'vgf',
    ownerName: 'Vastgoedbeheer Fryslân B.V.',
    meetrapport: { naam: 'Melvin Krikke', bedrijf: 'Krik je energielabel op', inmeetdatum: '25-08-2026', gow: 140, bi: 525 },
    floors: [
      { name: 'Begane grond', rooms: [{ name: 'Woonkamer', area: 32 }, { name: 'Keuken', area: 14 }, { name: 'Hal & toilet', area: 8 }, { name: 'Garage', area: 16 }, { name: 'Berging', area: 9 }] },
      { name: '1e verdieping', rooms: [{ name: 'Slaapkamer 1', area: 17 }, { name: 'Slaapkamer 2', area: 13 }, { name: 'Slaapkamer 3', area: 10 }, { name: 'Badkamer', area: 8 }, { name: 'Overloop', area: 9 }, { name: 'Bergruimte', area: 15 }] },
    ],
  },
  {
    id: 'hoofdstraat',
    address: 'Hoofdstraat 32',
    city: 'Sneek',
    postcode: '8601 CN',
    type: 'Bovenwoning',
    year: 1970,
    photoCount: 52,
    label: null,
    energyIndex: null,
    lifecycle: 'progress',
    fixedMode: 'plattegrond',
    assignedTo: 'bram',
    ownerId: 'vgf',
    ownerName: 'Vastgoedbeheer Fryslân B.V.',
    meetrapport: { naam: 'Melvin Krikke', bedrijf: 'Krik je energielabel op', inmeetdatum: '30-08-2026', gow: 62, bi: 236 },
    floors: [
      { name: 'Woonverdieping', rooms: [{ name: 'Woonkamer', area: 24 }, { name: 'Keuken', area: 10 }, { name: 'Slaapkamer 1', area: 13 }, { name: 'Slaapkamer 2', area: 9 }, { name: 'Badkamer', area: 6 }, { name: 'Hal', area: 6 }] },
    ],
  },
  {
    id: 'skoallestrjitte',
    address: 'Skoallestrjitte 5',
    city: 'Damwâld',
    postcode: '9104 DR',
    type: 'Twee-onder-een-kap',
    year: 2012,
    photoCount: 0,
    label: null,
    energyIndex: null,
    lifecycle: 'wait',
    fixedMode: 'both',
    assignedTo: 'ruben',
    floors: [
      { name: 'Begane grond', rooms: [{ name: 'Woonkamer', area: 30 }, { name: 'Keuken', area: 13 }, { name: 'Hal & toilet', area: 8 }, { name: 'Berging', area: 11 }] },
      { name: '1e verdieping', rooms: [{ name: 'Slaapkamer 1', area: 16 }, { name: 'Slaapkamer 2', area: 12 }, { name: 'Badkamer', area: 8 }, { name: 'Overloop', area: 10 }] },
    ],
  },
];

export const SEED_PROPERTY_ORDER = SEED_PROPERTIES.map((p) => p.id);

/** Real measurement report figures, used verbatim where they exist. */
export const NEN_REAL: Record<string, { floors: NenFloorRow[]; totals: NenRow }> = {
  monsmastate: {
    floors: [
      { name: 'Begane grond', or: 0, vide: 0, gow: 52.8, gooir: 22.7, gogbr: 4.94, goeb: 0, bi: 261, biExt: 0 },
      { name: 'Eerste verdieping', or: 20.3, vide: 0, gow: 57.6, gooir: 0, gogbr: 0, goeb: 0, bi: 181, biExt: 0 },
      { name: 'Tweede verdieping', or: 20.1, vide: 0, gow: 21.2, gooir: 0, gogbr: 0, goeb: 0, bi: 78, biExt: 0 },
    ],
    totals: { or: 40.4, vide: 0, gow: 132, gooir: 22.7, gogbr: 4.94, goeb: 0, bi: 520, biExt: 0 },
  },
  skuorre: {
    floors: [
      { name: 'Begane grond', or: 0, vide: 0, gow: 56.43, gooir: 0, gogbr: 0, goeb: 0, bi: 215, biExt: 0 },
      { name: 'Eerste verdieping', or: 0, vide: 0, gow: 43.84, gooir: 0, gogbr: 0, goeb: 0, bi: 149, biExt: 0 },
      { name: 'Tweede verdieping', or: 12.21, vide: 0, gow: 32.55, gooir: 0, gogbr: 0, goeb: 0, bi: 133, biExt: 0 },
      { name: 'Berging', or: 0, vide: 0, gow: 0, gooir: 0, gogbr: 0, goeb: 8.44, bi: 0, biExt: 35 },
    ],
    totals: { or: 12.21, vide: 0, gow: 132.82, gooir: 0, gogbr: 0, goeb: 8.44, bi: 497, biExt: 35 },
  },
};

export interface NenRow {
  or: number; vide: number; gow: number; gooir: number; gogbr: number; goeb: number; bi: number; biExt: number;
}
export interface NenFloorRow extends NenRow {
  name: string;
}
