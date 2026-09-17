import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureConjugationCards } from "@/lib/cards";
import { CONJ_CARD_BY_KEY, type Person } from "@/lib/conjugation";

export const dynamic = "force-dynamic";

const DEFAULT_SIZE = 20;

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
  const windowSize = Math.max(size * 4, 60);
  const { data, error } = await supabase
    .from("conjugation_progress")
    .select("card_key")
    .eq("profile_id", profileId)
    .eq("mastered", false)
    .lte("due_at", nowIso)
    .order("last_reviewed_at", { ascending: true, nullsFirst: true })
    .limit(windowSize);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pool: ConjSessionCard[] = [];
  for (const row of data ?? []) {
    const card = CONJ_CARD_BY_KEY.get(row.card_key);
    if (!card) continue; // stale key no longer in the catalog
    pool.push({
      card_key: card.key,
      verb: card.verb,
      personLabel: card.personLabel,
      tenseLabel: card.tenseLabel,
      kind: card.kind,
      answer: card.answer,
      person: card.person,
    });
  }

  // Shuffle the whole due pool, then take this session's cards.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return NextResponse.json({ cards: pool.slice(0, size) });
}
