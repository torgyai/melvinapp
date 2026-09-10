import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import type { IndicatieInput, PhotoKey } from '@/lib/indicatie';
import type { LabelKey, LeadContact, Property } from '@/lib/types';

interface LeadRequest {
  input: IndicatieInput;
  result: { label: LabelKey; index: number };
  contact: LeadContact;
  photos?: Partial<Record<PhotoKey, string | null>>;
  photoAi?: Partial<Record<PhotoKey, string | null>>;
}

function isLeadRequest(body: unknown): body is LeadRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  const input = b.input as Record<string, unknown> | undefined;
  const result = b.result as Record<string, unknown> | undefined;
  const contact = b.contact as Record<string, unknown> | undefined;
  return (
    typeof input?.straat === 'string' &&
    typeof input?.huisnummer === 'string' &&
    typeof result?.label === 'string' &&
    typeof result?.index === 'number' &&
    typeof contact?.naam === 'string' &&
    contact.naam.trim() !== '' &&
    typeof contact?.email === 'string' &&
    contact.email.trim() !== ''
  );
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isLeadRequest(body)) {
    return NextResponse.json({ error: 'Onvolledige aanvraag' }, { status: 400 });
  }
  const { input: v, result: r, contact } = body;
  const property: Property = {
    id: randomUUID(),
    address: `${v.straat} ${v.huisnummer}`.trim(),
    city: v.plaats || '',
    postcode: v.postcode || null,
    type: v.type || 'Tussenwoning',
    year: Number(v.year) || null,
    photoCount: 0,
    label: null,
    energyIndex: null,
    lifecycle: 'wait',
    fixedMode: 'both',
    assignedTo: null,
    leadSource: 'publiek',
    leadAt: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    leadArea: Number(v.area) || null,
    leadContact: {
      naam: contact.naam.trim(),
      email: contact.email.trim(),
      telefoon: contact.telefoon?.trim() || undefined,
    },
    leadIndicatie: { label: r.label, index: r.index },
    leadKenmerken: {
      postcode: v.postcode,
      bouwlagen: v.bouwlagen,
      verwarming: v.verwarming,
      dakIsolatie: v.dakIsolatie,
      gevelIsolatie: v.gevelIsolatie,
      glas: v.glas,
      zonnepanelen: v.zonnepanelen,
      zonAantal: v.zonAantal,
    },
    leadPhotos: body.photos ?? null,
    leadPhotoAi: body.photoAi ?? null,
    floors: [],
  };
  const saved = await getStore().upsertProperty(property);
  revalidatePath('/', 'layout');
  return NextResponse.json({ id: saved.id });
}
