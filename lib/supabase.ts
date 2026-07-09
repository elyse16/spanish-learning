import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the service role key.
// This module must never be imported into a client component — the service
// role key bypasses row-level security and must stay on the server.
//
// The client is created lazily on first use (at request time), never at
// import time. This keeps `next build` from failing when env vars aren't
// present during the build/page-data-collection step.

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill them in (or set them in your Vercel project settings)."
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}

// A proxy so existing call sites (`supabase.from(...)`) keep working while the
// underlying client is only instantiated on first property access.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getClient(), prop, receiver);
    return typeof value === "function" ? value.bind(getClient()) : value;
  },
});

export type Direction = "es_to_en" | "en_to_es";

export interface Word {
  id: string;
  spanish: string;
  english: string;
  created_at: string;
}

export interface CardProgress {
  id: string;
  word_id: string;
  direction: Direction;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  due_at: string;
  last_reviewed_at: string | null;
  mastered: boolean;
}
