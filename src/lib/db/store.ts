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

export interface Store {
  readonly kind: 'memory' | 'supabase';

  listProfiles(): Promise<Profile[]>;

  listProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | null>;
  upsertProperty(p: Property): Promise<Property>;
  updateProperty(id: string, patch: Partial<Property>): Promise<Property | null>;

  listTasks(): Promise<Task[]>;
  saveTask(t: Task): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  listNotes(propertyId: string): Promise<Note[]>;
  addNote(n: Note): Promise<Note>;

  listEmails(): Promise<Email[]>;
  updateEmail(id: string, patch: Partial<Email>): Promise<Email | null>;
  listSentEmails(): Promise<SentEmail[]>;
  addSentEmail(e: SentEmail): Promise<SentEmail>;

  createCaptureSession(s: CaptureSession): Promise<CaptureSession>;
  getCaptureSessionByToken(token: string): Promise<CaptureSession | null>;
  getCaptureSession(id: string): Promise<CaptureSession | null>;
  listCaptureSessions(propertyId?: string): Promise<CaptureSession[]>;
  updateCaptureSession(id: string, patch: Partial<CaptureSession>): Promise<CaptureSession | null>;
  addCapturePhoto(sessionId: string, photo: CapturePhoto): Promise<CapturePhoto>;
}
