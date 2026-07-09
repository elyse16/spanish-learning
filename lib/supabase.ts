import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using the service role key.
// This module must never be imported into a client component — the service
// role key bypasses row-level security and must stay on the server.

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill them in."
  );
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
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
