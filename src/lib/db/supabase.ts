import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CapturePhoto,
  CaptureSession,
  Email,
  Note,
  Profile,
  Property,
  SentEmail,
  Task,
} from '@/lib/types';
import type { Store } from './store';

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/* ---------- row shapes ---------- */

type PropertyRow = {
  id: string;
  address: string;
  city: string;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  type: string;
  year: number | null;
  photo_count: number;
  label: string | null;
  energy_index: number | null;
  lifecycle: string;
  fixed_mode: string | null;
  assigned_to: string | null;
  owner_id: string | null;
  owner_name: string | null;
  meetrapport: unknown;
  signoff: unknown;
  floors: unknown;
  runtime: unknown;
  lead: unknown;
  sort_order: number;
};

function toProperty(r: PropertyRow): Property {
  const lead = (r.lead ?? {}) as Record<string, unknown>;
  return {
    id: r.id,
    address: r.address,
    city: r.city,
    postcode: r.postcode,
    lat: r.lat,
    lon: r.lon,
    type: r.type,
    year: r.year,
    photoCount: r.photo_count,
    label: (r.label as Property['label']) ?? null,
    energyIndex: r.energy_index,
    lifecycle: r.lifecycle as Property['lifecycle'],
    fixedMode: (r.fixed_mode as Property['fixedMode']) ?? undefined,
    assignedTo: r.assigned_to,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    meetrapport: (r.meetrapport as Property['meetrapport']) ?? null,
    signoff: (r.signoff as Property['signoff']) ?? null,
    floors: (r.floors as Property['floors']) ?? [],
    runtime: (r.runtime as Property['runtime']) ?? undefined,
    leadSource: (lead.source as 'publiek' | undefined) ?? null,
    leadAt: (lead.at as string | undefined) ?? null,
    leadArea: (lead.area as number | undefined) ?? null,
    leadContact: (lead.contact as Property['leadContact']) ?? null,
    leadIndicatie: (lead.indicatie as Property['leadIndicatie']) ?? null,
    leadKenmerken: (lead.kenmerken as Property['leadKenmerken']) ?? null,
    leadPhotos: (lead.photos as Property['leadPhotos']) ?? null,
    leadPhotoAi: (lead.photoAi as Property['leadPhotoAi']) ?? null,
  };
}

function fromProperty(p: Property, sortOrder = 0): PropertyRow {
  return {
    id: p.id,
    address: p.address,
    city: p.city,
    postcode: p.postcode ?? null,
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    type: p.type,
    year: p.year,
    photo_count: p.photoCount,
    label: p.label,
    energy_index: p.energyIndex,
    lifecycle: p.lifecycle,
    fixed_mode: p.fixedMode ?? null,
    assigned_to: p.assignedTo,
    owner_id: p.ownerId ?? null,
    owner_name: p.ownerName ?? null,
    meetrapport: p.meetrapport ?? null,
    signoff: p.signoff ?? null,
    floors: p.floors,
    runtime: p.runtime ?? null,
    lead: p.leadSource
      ? {
          source: p.leadSource,
          at: p.leadAt,
          area: p.leadArea,
          contact: p.leadContact,
          indicatie: p.leadIndicatie,
          kenmerken: p.leadKenmerken,
          photos: p.leadPhotos,
          photoAi: p.leadPhotoAi,
        }
      : null,
    sort_order: sortOrder,
  };
}

type CaptureRow = {
  id: string;
  token: string;
  property_id: string;
  created_by: string;
  created_at: string;
  status: string;
  method: string | null;
  rooms: unknown;
  device_info: unknown;
  processed_at: string | null;
  error: string | null;
  capture_photos?: PhotoRow[];
};

type PhotoRow = {
  id: string;
  session_id: string;
  room_client_id: string | null;
  kind: string;
  storage_path: string | null;
  width: number | null;
  height: number | null;
  taken_at: string;
};

function toCapture(r: CaptureRow): CaptureSession {
  return {
    id: r.id,
    token: r.token,
    propertyId: r.property_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
    status: r.status as CaptureSession['status'],
    method: (r.method as CaptureSession['method']) ?? null,
    rooms: (r.rooms as CaptureSession['rooms']) ?? [],
    photos: (r.capture_photos ?? []).map((p) => ({
      id: p.id,
      roomClientId: p.room_client_id,
      kind: p.kind as CapturePhoto['kind'],
      storagePath: p.storage_path,
      width: p.width ?? undefined,
      height: p.height ?? undefined,
      takenAt: p.taken_at,
    })),
    deviceInfo: (r.device_info as CaptureSession['deviceInfo']) ?? null,
    processedAt: r.processed_at,
    error: r.error,
  };
}

/* ---------- store ---------- */

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  private db = client();

  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await this.db.from('profiles').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      roleNl: r.role === 'admin' ? 'Admin' : r.role === 'adviseur' ? 'Adviseur' : 'Administratie',
      roleEn: r.role === 'admin' ? 'Admin' : r.role === 'adviseur' ? 'Advisor' : 'Administration',
      email: r.email,
      phone: r.phone ?? undefined,
      avatarColor: r.avatar_color,
      avatarUrl: r.avatar_url ?? null,
    }));
  }

  async listProperties(): Promise<Property[]> {
    const { data, error } = await this.db.from('properties').select('*').order('sort_order');
    if (error) throw error;
    return (data ?? []).map(toProperty);
  }

  async getProperty(id: string): Promise<Property | null> {
    const { data, error } = await this.db.from('properties').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toProperty(data) : null;
  }

  async upsertProperty(p: Property): Promise<Property> {
    const { data, error } = await this.db.from('properties').upsert(fromProperty(p)).select().single();
    if (error) throw error;
    return toProperty(data);
  }

  async updateProperty(id: string, patch: Partial<Property>): Promise<Property | null> {
    const current = await this.getProperty(id);
    if (!current) return null;
    return this.upsertProperty({ ...current, ...patch });
  }

  async listTasks(): Promise<Task[]> {
    const { data, error } = await this.db.from('tasks').select('*').order('due');
    if (error) throw error;
    return (data ?? []).map((r) => ({ id: r.id, title: r.title, assignedTo: r.assigned_to, due: r.due, done: r.done }));
  }

  async saveTask(t: Task): Promise<Task> {
    const { error } = await this.db
      .from('tasks')
      .upsert({ id: t.id, title: t.title, assigned_to: t.assignedTo, due: t.due, done: t.done });
    if (error) throw error;
    return t;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await this.db.from('tasks').delete().eq('id', id);
    if (error) throw error;
  }

  async listNotes(propertyId: string): Promise<Note[]> {
    const { data, error } = await this.db.from('notes').select('*').eq('property_id', propertyId).order('created_at');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, propertyId: r.property_id, author: r.author, authorId: r.author_id, text: r.text, ts: r.ts,
    }));
  }

  async addNote(n: Note): Promise<Note> {
    const { error } = await this.db
      .from('notes')
      .insert({ id: n.id, property_id: n.propertyId, author: n.author, author_id: n.authorId, text: n.text, ts: n.ts });
    if (error) throw error;
    return n;
  }

  async listEmails(): Promise<Email[]> {
    const { data, error } = await this.db.from('emails').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, from: r.from_name, fromEmail: r.from_email, subject: r.subject, date: r.date,
      category: r.category, assignedTo: r.assigned_to, answered: r.answered, read: r.read, body: r.body,
      forwardedTo: r.forwarded_to, forwardedAt: r.forwarded_at,
    }));
  }

  async updateEmail(id: string, patch: Partial<Email>): Promise<Email | null> {
    const row: Record<string, unknown> = {};
    if (patch.answered !== undefined) row.answered = patch.answered;
    if (patch.read !== undefined) row.read = patch.read;
    if (patch.assignedTo !== undefined) row.assigned_to = patch.assignedTo;
    if (patch.forwardedTo !== undefined) row.forwarded_to = patch.forwardedTo;
    if (patch.forwardedAt !== undefined) row.forwarded_at = patch.forwardedAt;
    const { data, error } = await this.db.from('emails').update(row).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const all = await this.listEmails();
    return all.find((e) => e.id === id) ?? null;
  }

  async listSentEmails(): Promise<SentEmail[]> {
    const { data, error } = await this.db.from('sent_emails').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, type: r.type, to: r.to_email, toName: r.to_name, subject: r.subject, body: r.body,
      date: r.date, relatedId: r.related_id,
    }));
  }

  async addSentEmail(e: SentEmail): Promise<SentEmail> {
    const { error } = await this.db.from('sent_emails').insert({
      id: e.id, type: e.type, to_email: e.to, to_name: e.toName, subject: e.subject, body: e.body,
      date: e.date, related_id: e.relatedId,
    });
    if (error) throw error;
    return e;
  }

  async createCaptureSession(s: CaptureSession): Promise<CaptureSession> {
    const { error } = await this.db.from('capture_sessions').insert({
      id: s.id, token: s.token, property_id: s.propertyId, created_by: s.createdBy, created_at: s.createdAt,
      status: s.status, method: s.method, rooms: s.rooms, device_info: s.deviceInfo ?? null,
    });
    if (error) throw error;
    return s;
  }

  async getCaptureSessionByToken(token: string): Promise<CaptureSession | null> {
    const { data, error } = await this.db
      .from('capture_sessions')
      .select('*, capture_photos(*)')
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    return data ? toCapture(data) : null;
  }

  async getCaptureSession(id: string): Promise<CaptureSession | null> {
    const { data, error } = await this.db
      .from('capture_sessions')
      .select('*, capture_photos(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toCapture(data) : null;
  }

  async listCaptureSessions(propertyId?: string): Promise<CaptureSession[]> {
    let q = this.db.from('capture_sessions').select('*, capture_photos(*)').order('created_at', { ascending: false });
    if (propertyId) q = q.eq('property_id', propertyId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toCapture);
  }

  async updateCaptureSession(id: string, patch: Partial<CaptureSession>): Promise<CaptureSession | null> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.method !== undefined) row.method = patch.method;
    if (patch.rooms !== undefined) row.rooms = patch.rooms;
    if (patch.deviceInfo !== undefined) row.device_info = patch.deviceInfo;
    if (patch.processedAt !== undefined) row.processed_at = patch.processedAt;
    if (patch.error !== undefined) row.error = patch.error;
    const { error } = await this.db.from('capture_sessions').update(row).eq('id', id);
    if (error) throw error;
    return this.getCaptureSession(id);
  }

  async addCapturePhoto(sessionId: string, photo: CapturePhoto): Promise<CapturePhoto> {
    const { error } = await this.db.from('capture_photos').insert({
      id: photo.id, session_id: sessionId, room_client_id: photo.roomClientId, kind: photo.kind,
      storage_path: photo.storagePath, width: photo.width ?? null, height: photo.height ?? null,
      taken_at: photo.takenAt,
    });
    if (error) throw error;
    return photo;
  }
}
