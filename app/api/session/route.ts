import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

const DEFAULT_SIZE = 20;
// Sample the session from the whole due pool (personal decks stay well under
// this), so recent additions and every theme get a fair random shot.
const POOL_CAP = 2000;
// Cap how many never-studied words a single session can introduce, so new
// vocab eases in instead of flooding out the due reviews that protect memory.
const NEW_PER_SESSION = 12;

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
// Returns up to `size` due cards (mastered excluded): due reviews first
// (most-overdue first), then up to NEW_PER_SESSION never-studied words to fill
// the rest — so reviews are protected and new vocab eases in a little at a time.
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
  // Pull the whole pool of currently-due cards (mastered excluded).
  const { data, error } = await supabase
    .from("card_progress")
    .select("id, word_id, direction, last_reviewed_at, due_at, words!inner(spanish, english)")
    .eq("profile_id", profileId)
    .eq("direction", direction)
    .eq("mastered", false)
    .lte("due_at", nowIso)
    .limit(POOL_CAP);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Entry = { card: SessionCard; due: number; r: number };
  const reviews: Entry[] = []; // seen before and now due
  const fresh: Entry[] = []; // never studied yet
  for (const row of data ?? []) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    const spanish = word?.spanish ?? "";
    const english = word?.english ?? "";
    const entry: Entry = {
      card: {
        card_id: row.id,
        word_id: row.word_id,
        direction,
        spanish,
        english,
        prompt: direction === "es_to_en" ? spanish : english,
        answer: direction === "es_to_en" ? english : spanish,
      },
      due: row.due_at ? Date.parse(row.due_at) : 0,
      r: Math.random(),
    };
    (row.last_reviewed_at ? reviews : fresh).push(entry);
  }

  // Reviews come first and fill as much of the session as they can — these are
  // the words at risk of being forgotten. Most-overdue first, random tiebreak.
  reviews.sort((a, b) => a.due - b.due || a.r - b.r);
  // Then top up with a capped number of never-studied words (random order), so
  // new vocab is introduced steadily rather than all at once.
  fresh.sort((a, b) => a.r - b.r);

  const chosen = reviews.slice(0, size);
  const newSlots = Math.min(NEW_PER_SESSION, size - chosen.length);
  if (newSlots > 0) chosen.push(...fresh.slice(0, newSlots));

  const cards = chosen.map((p) => p.card);
  return NextResponse.json({ cards });
}
