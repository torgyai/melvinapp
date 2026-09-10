import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getStore } from '@/lib/db';
import { processCapture } from '@/lib/floorplan/process';
import { gapsFor } from '@/lib/opname/record';
import type { Property } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Closing a capture: the rooms become floors, the floors become a plan and a
 * measurement table, and the property moves on to processing.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = getStore();
  const session = await store.getCaptureSessionByToken(token);
  if (!session) return NextResponse.json({ error: 'Onbekende opnamelink' }, { status: 404 });
  if (!session.rooms.length) return NextResponse.json({ error: 'Er zijn nog geen ruimtes opgenomen' }, { status: 400 });
  if (session.status === 'processed') {
    return NextResponse.json({ error: 'Deze opname is al verwerkt' }, { status: 409 });
  }

  // Een energielabel mag niet worden afgemeld op alleen maten. Het
  // opnameformulier NTA 8800 moet compleet zijn, inclusief de bewijsfoto's.
  if (!session.opname) {
    return NextResponse.json({ error: 'Het opnameformulier is nog niet ingevuld' }, { status: 400 });
  }
  const gaps = gapsFor(session.opname);
  if (gaps.length) {
    return NextResponse.json(
      {
        error: `Het opnameformulier is nog niet compleet: ${gaps.length} punt${gaps.length === 1 ? '' : 'en'} open`,
        gaps: gaps.slice(0, 20),
      },
      { status: 400 },
    );
  }

  await store.updateCaptureSession(session.id, { status: 'processing' });

  const property = await store.getProperty(session.propertyId);
  try {
    const result = processCapture(session, property);

    // Een afgemeld pand blijft afgemeld: een nieuwe opname mag een getekend
    // rapport niet terugzetten. De opname wordt wel verwerkt en bewaard.
    if (property && property.lifecycle !== 'done') {
      const patch: Partial<Property> = {
        floors: result.floors,
        opname: session.opname,
        photoCount: session.photos.length,
        lifecycle: 'interactive',
        runtime: {
          mode: property.runtime?.mode ?? property.fixedMode ?? 'both',
          processed: false,
          processing: false,
        },
      };
      if (!property.label) {
        patch.label = result.estimate.label;
        patch.energyIndex = result.estimate.index;
      }
      await store.updateProperty(property.id, patch);
    }

    await store.updateCaptureSession(session.id, {
      status: 'processed',
      processedAt: new Date().toISOString(),
      error: null,
    });
    revalidatePath('/', 'layout');

    return NextResponse.json({
      propertyId: session.propertyId,
      floors: result.floors.map((f) => ({ name: f.name, rooms: f.rooms.length })),
      totalArea: result.totalArea,
      estimate: result.estimate,
      warnings:
        property?.lifecycle === 'done'
          ? [...result.warnings, 'Dit pand is al afgemeld. De opname is bewaard, maar het bestaande rapport is niet overschreven.']
          : result.warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verwerken is mislukt';
    await store.updateCaptureSession(session.id, { status: 'failed', error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
