import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureConjugationCards } from "@/lib/cards";
import { CONJ_CARD_BY_KEY, type Person } from "@/lib/conjugation";

export const dynamic = "force-dynamic";

const DEFAULT_SIZE = 20;
const POOL_CAP = 2000;

export interface ConjSessionCard {
  card_key: string;
  verb: string;
  personLabel: string;
  tenseLabel: string;
  kind: "regular" | "irregular";
  answer: string;
  person: Person;
}

// GET /api/conjugation/session?size=20 — due conjugation cards, randomly sampled.
export async function GET(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const size = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("size") ?? String(DEFAULT_SIZE), 10) || DEFAULT_SIZE)
  );

  await ensureConjugationCards(profileId);

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("conjugation_progress")
    .select("card_key, last_reviewed_at")
    .eq("profile_id", profileId)
    .eq("mastered", false)
    .lte("due_at", nowIso)
    .limit(POOL_CAP);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Least-recently-studied first (never-studied at the front), shuffled within
  // each freshness tier — so you work through everything before repeats.
  const pool = [];
  for (const row of data ?? []) {
    const card = CONJ_CARD_BY_KEY.get(row.card_key);
    if (!card) continue; // stale key no longer in the catalog
    pool.push({
      card: {
        card_key: card.key,
        verb: card.verb,
        personLabel: card.personLabel,
        tenseLabel: card.tenseLabel,
        kind: card.kind,
        answer: card.answer,
        person: card.person,
      } as ConjSessionCard,
      t: row.last_reviewed_at ? Date.parse(row.last_reviewed_at) : -Infinity,
      r: Math.random(),
    });
  }

  pool.sort((a, b) => a.t - b.t || a.r - b.r);

  return NextResponse.json({ cards: pool.slice(0, size).map((p) => p.card) });
}
