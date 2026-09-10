import type { OpnameRecord } from './opname/record';

export type Lifecycle = 'wait' | 'progress' | 'ready' | 'done' | 'interactive';
export type StatusKey = 'wait' | 'progress' | 'ready' | 'done';
export type OutputMode = 'both' | 'plattegrond' | 'label';
export type LabelKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Role = 'admin' | 'adviseur' | 'administratie';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  roleNl: string;
  roleEn: string;
  email: string;
  phone?: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

/** A point in metres, in the floor's own coordinate frame. */
export interface Pt {
  x: number;
  y: number;
}

export interface Room {
  id?: string;
  name: string;
  /** Usable floor area in m2. */
  area: number;
  /** Captured outline in metres. Present for scanned rooms. */
  poly?: Pt[];
  /** Free ceiling height in metres, when the capture measured it. */
  height?: number;
  /** Openings on the room outline, as fractions along the wall they sit on. */
  openings?: Opening[];
}

export interface Opening {
  /** Index of the wall in the polygon (wall i runs from poly[i] to poly[i+1]). */
  wall: number;
  /** Distance from the wall start, in metres. */
  offset: number;
  width: number;
  kind: 'deur' | 'raam' | 'doorgang';
}

export interface Floor {
  id?: string;
  name: string;
  /** Stored plan image (a real Floorplanner-style export), when one exists. */
  planImage?: string | null;
  rooms: Room[];
}

export interface Meetrapport {
  naam: string;
  bedrijf: string;
  inmeetdatum: string;
  gow: number;
  bi: number;
}

export interface Signoff {
  adviseur: string;
  conceptdatum?: string;
  datum: string;
  epOnlineId: string;
}

export interface LeadContact {
  naam: string;
  email: string;
  telefoon?: string;
}

export interface LeadKenmerken {
  postcode?: string;
  bouwlagen?: string;
  verwarming?: string;
  dakIsolatie?: string;
  gevelIsolatie?: string;
  glas?: string;
  zonnepanelen?: boolean;
  zonAantal?: string | number;
}

export interface Runtime {
  mode: OutputMode | null;
  processed: boolean;
  processing: boolean;
}

export interface Property {
  id: string;
  address: string;
  city: string;
  postcode?: string | null;
  lat?: number | null;
  lon?: number | null;
  type: string;
  year: number | null;
  photoCount: number;
  label: LabelKey | null;
  energyIndex: number | null;
  lifecycle: Lifecycle;
  fixedMode?: OutputMode;
  assignedTo: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  meetrapport?: Meetrapport | null;
  signoff?: Signoff | null;
  floors: Floor[];
  /** The opname record the field capture filled in, once it has been sent. */
  opname?: OpnameRecord | null;
  runtime?: Runtime;
  leadSource?: 'publiek' | null;
  leadAt?: string | null;
  leadArea?: number | null;
  leadContact?: LeadContact | null;
  leadIndicatie?: { label: LabelKey; index: number } | null;
  leadKenmerken?: LeadKenmerken | null;
  leadPhotos?: Record<string, string | null> | null;
  leadPhotoAi?: Record<string, string | null> | null;
}

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  due: string;
  done: boolean;
}

export interface Note {
  id: string;
  propertyId: string;
  author: string;
  authorId: string;
  text: string;
  ts: string;
}

export type EmailCategory = 'aanvraag' | 'intern' | 'systeem';

export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
  category: EmailCategory;
  assignedTo: string | null;
  answered: boolean;
  read: boolean;
  body: string;
  forwardedTo?: string | null;
  forwardedAt?: string | null;
}

export interface SentEmail {
  id: string;
  type: 'forward' | 'new' | 'reply';
  to: string;
  toName: string;
  subject: string;
  body: string;
  date: string;
  relatedId: string | null;
}

/* ---------- capture (phone scan) ---------- */

export type CaptureMethod = 'camera' | 'ar' | 'manual' | 'lidar' | 'import';
export type CaptureStatus = 'open' | 'capturing' | 'uploaded' | 'processing' | 'processed' | 'failed';

export interface CaptureRoom {
  clientId: string;
  name: string;
  floorName: string;
  method: CaptureMethod;
  /** Outline in metres, first point is the origin of the capture. */
  poly: Pt[];
  height?: number;
  openings?: Opening[];
  /** Compass heading in degrees of the first wall, when the device reported one. */
  heading?: number;
  photoIds: string[];
  note?: string;
}

export interface CaptureSession {
  id: string;
  token: string;
  propertyId: string;
  createdBy: string;
  createdAt: string;
  status: CaptureStatus;
  method: CaptureMethod | null;
  rooms: CaptureRoom[];
  photos: CapturePhoto[];
  /** The filled-in ISSO 82.1 opnameformulier for this property. */
  opname?: OpnameRecord | null;
  deviceInfo?: Record<string, string | number | boolean> | null;
  processedAt?: string | null;
  error?: string | null;
}

export interface CapturePhoto {
  id: string;
  roomClientId: string | null;
  kind: 'ruimte' | 'voorgevel' | 'installatie' | 'meterkast' | 'detail';
  /** Which bewijslast-eis on the opnameformulier this photo answers. */
  opnameKey?: string | null;
  storagePath: string | null;
  /** Only used in demo mode, where there is no object storage. */
  dataUrl?: string | null;
  width?: number;
  height?: number;
  takenAt: string;
}
