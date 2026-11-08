import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

const DEFAULT_SIZE = 20;
// Sample the session from the whole due pool (personal decks stay well under
// this), so recent additions and every theme get a fair random shot.
const POOL_CAP = 2000;
// How many never-studied words each session reserves slots for. Guaranteed to
// get in (when that many new words are available), so new vocab keeps flowing
// even behind a big review backlog; reviews fill the rest of the session.
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
// Returns up to `size` due cards (mastered excluded): reserves up to
// NEW_PER_SESSION never-studied words so new vocab always flows, then fills the
// rest with due reviews (most-overdue first). Cards are shuffled together.
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

  type Entry = { card: SessionCard; due: number; r: number; isNew: boolean };
  const reviews: Entry[] = []; // seen before and now due
  const fresh: Entry[] = []; // never studied yet
  for (const row of data ?? []) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    const spanish = word?.spanish ?? "";
    const english = word?.english ?? "";
    const isNew = !row.last_reviewed_at;
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
      isNew,
    };
    (isNew ? fresh : reviews).push(entry);
  }

  // Reviews: most-overdue first (at highest risk of being forgotten).
  reviews.sort((a, b) => a.due - b.due || a.r - b.r);
  // New words: random order.
  fresh.sort((a, b) => a.r - b.r);

  // RESERVE slots for new words so they always get in — even when a big backlog
  // of due reviews would otherwise fill the entire session. Reviews take the
  // rest of the session. If one side is short, the other tops the session up.
  const newTarget = Math.min(NEW_PER_SESSION, fresh.length, size);
  const reviewTarget = Math.min(reviews.length, size - newTarget);
  const picked: Entry[] = [...fresh.slice(0, newTarget), ...reviews.slice(0, reviewTarget)];
  if (picked.length < size) {
    const rest = [...reviews.slice(reviewTarget), ...fresh.slice(newTarget)];
    picked.push(...rest.slice(0, size - picked.length));
  }

  // Shuffle so new words are sprinkled through the set, not clustered up front.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  const cards = picked.map((p) => p.card);
  if (searchParams.get("meta") === "1") {
    const newInSession = picked.filter((p) => p.isNew).length;
    return NextResponse.json({
      cards,
      _meta: {
        dueReviews: reviews.length,
        dueNew: fresh.length,
        newInSession,
        reviewInSession: picked.length - newInSession,
      },
    });
  }
  return NextResponse.json({ cards });
}
