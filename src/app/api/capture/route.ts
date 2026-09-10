import { NextResponse } from 'next/server';
import { createCaptureSession } from '@/lib/capture/session';
import { getStore } from '@/lib/db';

export async function POST(req: Request) {
  const body = (await req.json()) as { propertyId?: string; createdBy?: string };
  if (!body.propertyId) {
    return NextResponse.json({ error: 'propertyId ontbreekt' }, { status: 400 });
  }
  const property = await getStore().getProperty(body.propertyId);
  if (!property) return NextResponse.json({ error: 'Pand niet gevonden' }, { status: 404 });

  const session = await createCaptureSession(body.propertyId, body.createdBy ?? 'melvin');
  return NextResponse.json({ id: session.id, token: session.token });
}
