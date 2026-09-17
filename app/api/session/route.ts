import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

const DEFAULT_SIZE = 20;

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
  // Pull a window of the *least-recently-studied* due cards (never-seen first),
  // then randomly sample the session from that window. This mixes themes and
  // difficulty AND pushes anything you just studied to the bottom of the pile.
  const windowSize = Math.max(size * 4, 60);
  const { data, error } = await supabase
    .from("card_progress")
    .select("id, word_id, direction, words!inner(spanish, english)")
    .eq("profile_id", profileId)
    .eq("direction", direction)
    .eq("mastered", false)
    .lte("due_at", nowIso)
    .order("last_reviewed_at", { ascending: true, nullsFirst: true })
    .limit(windowSize);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pool: SessionCard[] = (data ?? []).map((row) => {
    // Supabase types the joined relation as an array; grab the single word.
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    const spanish = word?.spanish ?? "";
    const english = word?.english ?? "";
    return {
      card_id: row.id,
      word_id: row.word_id,
      direction,
      spanish,
      english,
      prompt: direction === "es_to_en" ? spanish : english,
      answer: direction === "es_to_en" ? english : spanish,
    };
  });

  // Fisher-Yates shuffle the whole due pool, then take this session's cards.
  // Random sampling across all due cards mixes themes and difficulty, and
  // makes each session (and any "study more") a fresh random draw.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const cards = pool.slice(0, size);
  return NextResponse.json({ cards });
}
