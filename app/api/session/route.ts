import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

const DEFAULT_SIZE = 20;
// Sample the session from the whole due pool (personal decks stay well under
// this), so recent additions and every theme get a fair random shot.
const POOL_CAP = 2000;

export interface SessionCard {
  card_id: string;
  word_id: string;
  direction: Direction;
  spanish: string;
  english: string;
  prompt: string;
  answer: string;
}

// GET /api/session?direction=es_to_en&size=20
// Returns up to `size` cards that are due now (mastered cards excluded).
// Newly added words are due immediately (due_at defaults to now()), so they
// mix in with overdue cards, most-overdue first.
export async function GET(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const direction = (searchParams.get("direction") ?? "es_to_en") as Direction;
  if (direction !== "es_to_en" && direction !== "en_to_es") {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }
  const size = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("size") ?? String(DEFAULT_SIZE), 10) || DEFAULT_SIZE)
  );

  // Pick up any shared words this profile doesn't have cards for yet.
  await ensureCardsForProfile(profileId);

  const nowIso = new Date().toISOString();
  // Pull the whole pool of currently-due cards. We then order by "freshness"
  // (least-recently-studied first, never-studied at the very front) and shuffle
  // *within* each freshness tier. This guarantees you cycle through all your
  // words before any repeats, while still mixing themes and giving recent
  // additions a fair chance. Cards you just answered have a recent
  // last_reviewed_at, so they sink to the bottom.
  const { data, error } = await supabase
    .from("card_progress")
    .select("id, word_id, direction, last_reviewed_at, words!inner(spanish, english)")
    .eq("profile_id", profileId)
    .eq("direction", direction)
    .eq("mastered", false)
    .lte("due_at", nowIso)
    .limit(POOL_CAP);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pool = (data ?? []).map((row) => {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    const spanish = word?.spanish ?? "";
    const english = word?.english ?? "";
    return {
      card: {
        card_id: row.id,
        word_id: row.word_id,
        direction,
        spanish,
        english,
        prompt: direction === "es_to_en" ? spanish : english,
        answer: direction === "es_to_en" ? english : spanish,
      } as SessionCard,
      // never-studied (null) sorts first; then oldest-studied.
      t: row.last_reviewed_at ? Date.parse(row.last_reviewed_at) : -Infinity,
      r: Math.random(), // random tiebreak within a freshness tier
    };
  });

  pool.sort((a, b) => a.t - b.t || a.r - b.r);

  const cards = pool.slice(0, size).map((p) => p.card);
  return NextResponse.json({ cards });
}
