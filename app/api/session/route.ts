import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";

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
  const { searchParams } = new URL(req.url);
  const direction = (searchParams.get("direction") ?? "es_to_en") as Direction;
  if (direction !== "es_to_en" && direction !== "en_to_es") {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }
  const size = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("size") ?? String(DEFAULT_SIZE), 10) || DEFAULT_SIZE)
  );

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("card_progress")
    .select("id, word_id, direction, words!inner(spanish, english)")
    .eq("direction", direction)
    .eq("mastered", false)
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(size);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cards: SessionCard[] = (data ?? []).map((row) => {
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

  return NextResponse.json({ cards });
}
