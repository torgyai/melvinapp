import { randomBytes, randomUUID } from 'node:crypto';
import { getStore } from '@/lib/db';
import type { CaptureSession } from '@/lib/types';

/** Short, unguessable link token. The phone opens /capture/<token> with nothing else. */
export function newCaptureToken(): string {
  return randomBytes(12).toString('base64url');
}

export async function createCaptureSession(propertyId: string, createdBy: string): Promise<CaptureSession> {
  const session: CaptureSession = {
    id: randomUUID(),
    token: newCaptureToken(),
    propertyId,
    createdBy,
    createdAt: new Date().toISOString(),
    status: 'open',
    method: null,
    rooms: [],
    photos: [],
  };
  return getStore().createCaptureSession(session);
}

export function captureUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  return `${base}/capture/${token}`;
}
