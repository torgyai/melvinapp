import { SEED_EMAILS, SEED_NOTES } from '@/data/emails';
import { PROFILES } from '@/data/profiles';
import { SEED_PROPERTIES } from '@/data/properties';
import { SEED_TASKS } from '@/data/tasks';
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

/**
 * In-process store, seeded with the demo portfolio. This is what the platform
 * runs on when no Supabase project is configured, so the repo starts up and is
 * clickable straight after `npm install`.
 */
class MemoryStore implements Store {
  readonly kind = 'memory' as const;

  private properties: Property[] = clone(SEED_PROPERTIES);
  private tasks: Task[] = clone(SEED_TASKS);
  private notes: Note[] = clone(SEED_NOTES);
  private emails: Email[] = clone(SEED_EMAILS);
  private sent: SentEmail[] = [];
  private captures: CaptureSession[] = [];

  async listProfiles(): Promise<Profile[]> {
    return PROFILES;
  }

  async listProperties(): Promise<Property[]> {
    return clone(this.properties);
  }

  async getProperty(id: string): Promise<Property | null> {
    return clone(this.properties.find((p) => p.id === id) ?? null);
  }

  async upsertProperty(p: Property): Promise<Property> {
    const i = this.properties.findIndex((x) => x.id === p.id);
    if (i >= 0) this.properties[i] = clone(p);
    else this.properties.push(clone(p));
    return clone(p);
  }

  async updateProperty(id: string, patch: Partial<Property>): Promise<Property | null> {
    const i = this.properties.findIndex((x) => x.id === id);
    if (i < 0) return null;
    this.properties[i] = { ...this.properties[i]!, ...clone(patch) };
    return clone(this.properties[i]!);
  }

  async listTasks(): Promise<Task[]> {
    return clone(this.tasks);
  }

  async saveTask(t: Task): Promise<Task> {
    const i = this.tasks.findIndex((x) => x.id === t.id);
    if (i >= 0) this.tasks[i] = clone(t);
    else this.tasks.push(clone(t));
    return clone(t);
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  async listNotes(propertyId: string): Promise<Note[]> {
    return clone(this.notes.filter((n) => n.propertyId === propertyId));
  }

  async addNote(n: Note): Promise<Note> {
    this.notes.push(clone(n));
    return clone(n);
  }

  async listEmails(): Promise<Email[]> {
    return clone(this.emails);
  }

  async updateEmail(id: string, patch: Partial<Email>): Promise<Email | null> {
    const i = this.emails.findIndex((e) => e.id === id);
    if (i < 0) return null;
    this.emails[i] = { ...this.emails[i]!, ...clone(patch) };
    return clone(this.emails[i]!);
  }

  async listSentEmails(): Promise<SentEmail[]> {
    return clone(this.sent);
  }

  async addSentEmail(e: SentEmail): Promise<SentEmail> {
    this.sent.push(clone(e));
    return clone(e);
  }

  async createCaptureSession(s: CaptureSession): Promise<CaptureSession> {
    this.captures.push(clone(s));
    return clone(s);
  }

  async getCaptureSessionByToken(token: string): Promise<CaptureSession | null> {
    return clone(this.captures.find((c) => c.token === token) ?? null);
  }

  async getCaptureSession(id: string): Promise<CaptureSession | null> {
    return clone(this.captures.find((c) => c.id === id) ?? null);
  }

  async listCaptureSessions(propertyId?: string): Promise<CaptureSession[]> {
    const list = propertyId ? this.captures.filter((c) => c.propertyId === propertyId) : this.captures;
    return clone(list);
  }

  async updateCaptureSession(id: string, patch: Partial<CaptureSession>): Promise<CaptureSession | null> {
    const i = this.captures.findIndex((c) => c.id === id);
    if (i < 0) return null;
    this.captures[i] = { ...this.captures[i]!, ...clone(patch) };
    return clone(this.captures[i]!);
  }

  async addCapturePhoto(sessionId: string, photo: CapturePhoto): Promise<CapturePhoto> {
    const s = this.captures.find((c) => c.id === sessionId);
    if (s) s.photos.push(clone(photo));
    return clone(photo);
  }
}

function clone<T>(v: T): T {
  return v === null || v === undefined ? v : (structuredClone(v) as T);
}

/**
 * Survives dev-server hot reloads, which would otherwise reset the portfolio on
 * every file save.
 */
const globalForStore = globalThis as unknown as { __krikMemoryStore?: MemoryStore };

export function memoryStore(): Store {
  if (!globalForStore.__krikMemoryStore) globalForStore.__krikMemoryStore = new MemoryStore();
  return globalForStore.__krikMemoryStore;
}
