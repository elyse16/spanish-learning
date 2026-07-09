import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface IncomingWord {
  spanish: string;
  english: string;
}

// POST /api/words — bulk insert words and create both direction cards for each.
export async function POST(req: Request) {
  let body: { words?: IncomingWord[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clean = (body.words ?? [])
    .map((w) => ({
      spanish: (w.spanish ?? "").trim(),
      english: (w.english ?? "").trim(),
    }))
    .filter((w) => w.spanish && w.english);

  if (clean.length === 0) {
    return NextResponse.json(
      { error: "No valid words. Each word needs both a Spanish and English value." },
      { status: 400 }
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("words")
    .insert(clean)
    .select("id");

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const directions: Direction[] = ["es_to_en", "en_to_es"];
  const cards = (inserted ?? []).flatMap((w) =>
    directions.map((direction) => ({ word_id: w.id, direction }))
  );

  const { error: cardErr } = await supabase.from("card_progress").insert(cards);
  if (cardErr) {
    return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: clean.length });
}
