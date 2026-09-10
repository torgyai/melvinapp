import { memoryStore } from './memory';
import type { Store } from './store';
import { SupabaseStore, supabaseConfigured } from './supabase';

let cached: Store | null = null;

/** Supabase when it is configured, the seeded in-process store otherwise. */
export function getStore(): Store {
  if (cached) return cached;
  cached = supabaseConfigured() ? new SupabaseStore() : memoryStore();
  return cached;
}

export type { Store };
export { supabaseConfigured };
