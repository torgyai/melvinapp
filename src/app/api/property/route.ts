import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getStore } from '@/lib/db';
import { lookupAddress } from '@/lib/lookup';
import type { Property } from '@/lib/types';

/** Een nieuw pand aanmaken vanuit het scanscherm, verrijkt met wat de bron geeft. */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    postcode?: string;
    huisnummer?: string;
    address?: string;
    city?: string;
    type?: string;
    assignedTo?: string | null;
  };

  let address = body.address?.trim() ?? '';
  let city = body.city?.trim() ?? '';
  let postcode = body.postcode?.trim() ?? '';
  let year: number | null = null;
  let lat: number | null = null;
  let lon: number | null = null;
  const sources: { source: string; reason: string }[] = [];

  if (body.postcode && body.huisnummer) {
    try {
      const found = await lookupAddress(body.postcode, body.huisnummer);
      if (found.address) {
        address = found.address.huis_nlt
          ? `${found.address.straatnaam} ${found.address.huis_nlt}`
          : `${found.address.straatnaam} ${found.address.huisnummer}`;
        city = found.address.woonplaatsnaam ?? city;
        postcode = found.address.postcode ?? postcode;
        lat = found.address.lat ?? null;
        lon = found.address.lon ?? null;
      }
      if (found.bag?.bouwjaar) year = found.bag.bouwjaar;
      sources.push(...found.unavailable);
    } catch (err) {
      sources.push({ source: 'PDOK', reason: err instanceof Error ? err.message : 'Adres opzoeken is mislukt.' });
    }
  }

  if (!address) return NextResponse.json({ error: 'Geen adres opgegeven of gevonden' }, { status: 400 });

  const property: Property = {
    id: randomUUID(),
    address,
    city,
    postcode: postcode || null,
    lat,
    lon,
    type: body.type?.trim() || 'Onbekend',
    year,
    photoCount: 0,
    label: null,
    energyIndex: null,
    lifecycle: 'wait',
    fixedMode: 'both',
    assignedTo: body.assignedTo ?? null,
    floors: [],
  };

  await getStore().upsertProperty(property);
  revalidatePath('/', 'layout');
  return NextResponse.json({ property, sources });
}
