/**
 * Zet de demo-portefeuille in een Supabase-project.
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed
 * Draai eerst de migratie in supabase/migrations.
 */
import { createClient } from '@supabase/supabase-js';
import { SEED_EMAILS, SEED_NOTES } from '../src/data/emails';
import { PROFILES } from '../src/data/profiles';
import { SEED_PROPERTIES } from '../src/data/properties';
import { SEED_TASKS } from '../src/data/tasks';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn verplicht.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const profiles = PROFILES.map((p) => ({
    id: p.id, name: p.name, role: p.role, email: p.email, phone: p.phone ?? null, avatar_color: p.avatarColor,
  }));
  await check('profiles', db.from('profiles').upsert(profiles));

  const properties = SEED_PROPERTIES.map((p, i) => ({
    id: p.id, address: p.address, city: p.city, postcode: p.postcode ?? null, lat: p.lat ?? null, lon: p.lon ?? null,
    type: p.type, year: p.year, photo_count: p.photoCount, label: p.label, energy_index: p.energyIndex,
    lifecycle: p.lifecycle, fixed_mode: p.fixedMode ?? null, assigned_to: p.assignedTo,
    owner_id: p.ownerId ?? null, owner_name: p.ownerName ?? null,
    meetrapport: p.meetrapport ?? null, signoff: p.signoff ?? null, floors: p.floors,
    runtime: p.runtime ?? null, lead: null, sort_order: i,
  }));
  await check('properties', db.from('properties').upsert(properties));

  await check(
    'tasks',
    db.from('tasks').upsert(SEED_TASKS.map((t) => ({ id: t.id, title: t.title, assigned_to: t.assignedTo, due: t.due, done: t.done }))),
  );

  await check(
    'notes',
    db.from('notes').upsert(
      SEED_NOTES.map((n) => ({ id: n.id, property_id: n.propertyId, author_id: n.authorId, author: n.author, text: n.text, ts: n.ts })),
    ),
  );

  await check(
    'emails',
    db.from('emails').upsert(
      SEED_EMAILS.map((e) => ({
        id: e.id, from_name: e.from, from_email: e.fromEmail, subject: e.subject, date: e.date,
        category: e.category, assigned_to: e.assignedTo, answered: e.answered, read: e.read, body: e.body,
      })),
    ),
  );

  console.log('Klaar.');
}

async function check(table: string, promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table} gevuld.`);
}

void run();
