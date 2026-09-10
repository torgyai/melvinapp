'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getStore } from '@/lib/db';
import { nowStamp } from '@/lib/format';
import type { Email, Note, Property, SentEmail, Task } from '@/lib/types';

export async function assignPropertyAction(propertyId: string, profileId: string | null) {
  await getStore().updateProperty(propertyId, { assignedTo: profileId });
  revalidatePath('/', 'layout');
}

export async function setPropertyModeAction(propertyId: string, mode: Property['fixedMode']) {
  const store = getStore();
  const p = await store.getProperty(propertyId);
  if (!p) return;
  if (p.lifecycle === 'interactive') {
    const changed = p.runtime?.mode !== mode;
    await store.updateProperty(propertyId, {
      runtime: { mode: mode ?? null, processed: changed ? false : Boolean(p.runtime?.processed), processing: false },
    });
  } else {
    await store.updateProperty(propertyId, { fixedMode: mode });
  }
  revalidatePath('/', 'layout');
}

export async function runPipelineAction(propertyId: string) {
  const store = getStore();
  const p = await store.getProperty(propertyId);
  if (!p || !p.runtime?.mode) return;
  await store.updateProperty(propertyId, { runtime: { ...p.runtime, processed: true, processing: false } });
  revalidatePath('/', 'layout');
}

export async function addNoteAction(propertyId: string, authorId: string, authorName: string, text: string) {
  if (!text.trim()) return;
  const note: Note = {
    id: randomUUID(),
    propertyId,
    authorId,
    author: authorName,
    text: text.trim(),
    ts: `Vandaag · ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`,
  };
  await getStore().addNote(note);
  revalidatePath('/panden/[id]', 'page');
  return note;
}

export async function saveTaskAction(task: Task) {
  await getStore().saveTask(task);
  revalidatePath('/', 'layout');
}

export async function toggleTaskAction(taskId: string) {
  const store = getStore();
  const tasks = await store.listTasks();
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return;
  await store.saveTask({ ...t, done: !t.done });
  revalidatePath('/', 'layout');
}

export async function updateEmailAction(id: string, patch: Partial<Email>) {
  await getStore().updateEmail(id, patch);
  revalidatePath('/', 'layout');
}

export async function sendEmailAction(e: Omit<SentEmail, 'id' | 'date'>) {
  const sent: SentEmail = { ...e, id: randomUUID(), date: nowStamp() };
  await getStore().addSentEmail(sent);
  revalidatePath('/email', 'page');
  return sent;
}
