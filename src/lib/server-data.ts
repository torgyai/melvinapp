import 'server-only';
import { getStore } from './db';
import type { Email, Profile, Property, SentEmail, Task } from './types';

export interface AppData {
  profiles: Profile[];
  properties: Property[];
  tasks: Task[];
  emails: Email[];
  sentEmails: SentEmail[];
  storeKind: 'memory' | 'supabase';
}

export async function loadAppData(): Promise<AppData> {
  const store = getStore();
  const [profiles, properties, tasks, emails, sentEmails] = await Promise.all([
    store.listProfiles(),
    store.listProperties(),
    store.listTasks(),
    store.listEmails(),
    store.listSentEmails(),
  ]);
  return { profiles, properties, tasks, emails, sentEmails, storeKind: store.kind };
}
