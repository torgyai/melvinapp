import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { supabaseConfigured } from '@/lib/db/supabase';
import type { CapturePhoto } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * One photo per request, so a phone on a weak connection retries a single frame
 * rather than the whole set.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = getStore();
  const session = await store.getCaptureSessionByToken(token);
  if (!session) return NextResponse.json({ error: 'Onbekende opnamelink' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Geen bestand ontvangen' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Foto is te groot' }, { status: 413 });

  const kind = (form.get('kind') as CapturePhoto['kind'] | null) ?? 'ruimte';
  const roomClientId = (form.get('roomClientId') as string | null) ?? null;
  const opnameKey = (form.get('opnameKey') as string | null) ?? null;
  const width = Number(form.get('width')) || undefined;
  const height = Number(form.get('height')) || undefined;

  const id = randomUUID();
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${session.id}/${id}.${ext}`;

  const photo: CapturePhoto = {
    id,
    roomClientId,
    kind,
    opnameKey,
    storagePath: supabaseConfigured() ? storagePath : null,
    width,
    height,
    takenAt: new Date().toISOString(),
  };

  if (supabaseConfigured()) {
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { error } = await db.storage
      .from('captures')
      .upload(storagePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Zonder objectopslag houden we de foto klein en in het geheugen, zodat de
    // opname zonder Supabase-project toch compleet door de keten loopt.
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.byteLength <= 2 * 1024 * 1024) {
      photo.dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;
    }
  }

  await store.addCapturePhoto(session.id, photo);
  return NextResponse.json({ photo });
}
