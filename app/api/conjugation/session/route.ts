import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureConjugationCards } from "@/lib/cards";
import { CONJ_VERB_BY_KEY, FULL_TABLE_AT, type ConjSlot } from "@/lib/conjugation";

export const dynamic = "force-dynamic";

const DEFAULT_SIZE = 8; // verbs per session
const POOL_CAP = 2000;

export interface ConjSessionVerb {
  card_key: string;
  verb: string;
  kind: "regular" | "irregular";
  tenseLabel: string;
  mode: "step" | "table"; // guided one-at-a-time, or full-table check
  slots: ConjSlot[];
}

// GET /api/conjugation/session?size=8 — due verbs, freshest first, shuffled
// within each freshness tier, each tagged with its adaptive mode.
export async function GET(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const size = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("size") ?? String(DEFAULT_SIZE), 10) || DEFAULT_SIZE)
  );

  await ensureConjugationCards(profileId);

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("conjugation_progress")
    .select("card_key, last_reviewed_at, repetitions")
    .eq("profile_id", profileId)
    .eq("mastered", false)
    .lte("due_at", nowIso)
    .limit(POOL_CAP);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Least-recently-studied first (never-studied at the front), random tiebreak.
  const pool = [];
  for (const row of data ?? []) {
    const verb = CONJ_VERB_BY_KEY.get(row.card_key);
    if (!verb) continue;
    pool.push({
      card: {
        card_key: verb.key,
        verb: verb.verb,
        kind: verb.kind,
        tenseLabel: verb.tenseLabel,
        mode: (row.repetitions ?? 0) >= FULL_TABLE_AT ? "table" : "step",
        slots: verb.slots,
      } as ConjSessionVerb,
      t: row.last_reviewed_at ? Date.parse(row.last_reviewed_at) : -Infinity,
      r: Math.random(),
    });
  }

  pool.sort((a, b) => a.t - b.t || a.r - b.r);

  return NextResponse.json({ verbs: pool.slice(0, size).map((p) => p.card) });
}
