import { NextResponse } from 'next/server';
import { lookupAddress, searchAddress } from '@/lib/lookup';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const postcode = url.searchParams.get('postcode');
  const huisnummer = url.searchParams.get('huisnummer');

  try {
    if (postcode && huisnummer) {
      return NextResponse.json(await lookupAddress(postcode, huisnummer));
    }
    if (q) {
      return NextResponse.json({ hits: await searchAddress(q) });
    }
    return NextResponse.json({ error: 'Geef q, of postcode en huisnummer mee' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Adres opzoeken is mislukt';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
