'use client';

import type { CaptureRoom } from '@/lib/types';

/**
 * The opname keeps working with no signal: rooms and queued photos live in
 * IndexedDB until the phone can reach the server again.
 */

const DB_NAME = 'krik-capture';
const DB_VERSION = 1;
const ROOMS = 'rooms';
const QUEUE = 'queue';

export interface QueuedPhoto {
  id: string;
  token: string;
  roomClientId: string | null;
  kind: string;
  blob: Blob;
  width: number;
  height: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROOMS)) db.createObjectStore(ROOMS);
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(name: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const req = fn(tx.objectStore(name));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Best effort: a browser with site data blocked must not dead-end the opname. */
export async function saveRooms(token: string, rooms: CaptureRoom[]): Promise<boolean> {
  try {
    await withStore(ROOMS, 'readwrite', (s) => s.put(rooms, token) as unknown as IDBRequest<undefined>);
    return true;
  } catch {
    return false;
  }
}

export async function loadRooms(token: string): Promise<CaptureRoom[] | null> {
  try {
    const rooms = await withStore<CaptureRoom[] | undefined>(ROOMS, 'readonly', (s) => s.get(token));
    return rooms ?? null;
  } catch {
    return null;
  }
}

export async function queuePhoto(photo: QueuedPhoto): Promise<boolean> {
  try {
    await withStore(QUEUE, 'readwrite', (s) => s.put(photo) as unknown as IDBRequest<undefined>);
    return true;
  } catch {
    return false;
  }
}

export async function listQueue(token: string): Promise<QueuedPhoto[]> {
  try {
    const all = await withStore<QueuedPhoto[]>(QUEUE, 'readonly', (s) => s.getAll());
    return all.filter((p) => p.token === token);
  } catch {
    return [];
  }
}

export async function dropFromQueue(id: string): Promise<void> {
  try {
    await withStore(QUEUE, 'readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  } catch {
    // Niets te doen: de foto is al verstuurd, hij blijft hooguit in de wachtrij staan.
  }
}

/** Send everything that is still waiting. Returns how many made it. */
export async function flushQueue(token: string): Promise<number> {
  const queued = await listQueue(token);
  let sent = 0;
  for (const p of queued) {
    const form = new FormData();
    form.set('file', p.blob, `${p.id}.jpg`);
    form.set('kind', p.kind);
    if (p.roomClientId) form.set('roomClientId', p.roomClientId);
    form.set('width', String(p.width));
    form.set('height', String(p.height));
    try {
      const res = await fetch(`/api/capture/${token}/photos`, { method: 'POST', body: form });
      if (res.ok) {
        await dropFromQueue(p.id);
        sent += 1;
      }
    } catch {
      break; // still offline; keep the rest for the next attempt
    }
  }
  return sent;
}
