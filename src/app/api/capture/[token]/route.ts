import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import type { CaptureRoom, CaptureSession } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** The phone and the desktop both read the session through its link token. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = getStore();
  const session = await store.getCaptureSessionByToken(token);
  if (!session) return NextResponse.json({ error: 'Onbekende opnamelink' }, { status: 404 });
  const property = await store.getProperty(session.propertyId);
  return NextResponse.json({ session, property });
}

/** The phone syncs its room list as it goes, so a dropped connection loses nothing. */
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = getStore();
  const session = await store.getCaptureSessionByToken(token);
  if (!session) return NextResponse.json({ error: 'Onbekende opnamelink' }, { status: 404 });
  if (session.status === 'processed') {
    return NextResponse.json({ error: 'Deze opname is al verwerkt' }, { status: 409 });
  }

  const body = (await req.json()) as Partial<
    Pick<CaptureSession, 'rooms' | 'status' | 'method' | 'deviceInfo' | 'opname'>
  >;
  const patch: Partial<CaptureSession> = {};
  if (Array.isArray(body.rooms)) patch.rooms = body.rooms as CaptureRoom[];
  if (body.status === 'capturing' || body.status === 'uploaded') patch.status = body.status;
  if (body.method) patch.method = body.method;
  if (body.deviceInfo) patch.deviceInfo = body.deviceInfo;
  if (body.opname) patch.opname = body.opname;

  const updated = await store.updateCaptureSession(session.id, patch);
  return NextResponse.json({ session: updated });
}
