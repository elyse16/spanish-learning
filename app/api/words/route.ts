import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

interface IncomingWord {
  spanish: string;
  english: string;
}

// Accent/case-insensitive key for dedup.
const normKey = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ");

// GET /api/words — the shared library's Spanish words (for duplicate checks).
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }
  const { data, error } = await supabase.from("words").select("spanish");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ spanish: (data ?? []).map((w) => w.spanish) });
}

// POST /api/words — bulk insert words and create both direction cards for each.
export async function POST(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  // `availableInDays` lets curated batches time-release: their cards become due
  // N days from now, so pre-loaded words drip into study ~a batch per week.
  let body: { words?: IncomingWord[]; availableInDays?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const availableInDays = Math.max(0, Math.floor(Number(body.availableInDays) || 0));

  const clean = (body.words ?? [])
    .map((w) => ({
      spanish: (w.spanish ?? "").trim(),
      english: (w.english ?? "").trim(),
      profile_id: profileId,
    }))
    .filter((w) => w.spanish && w.english);

  if (clean.length === 0) {
    return NextResponse.json(
      { error: "No valid words. Each word needs both a Spanish and English value." },
      { status: 400 }
    );
  }

  // Skip words already in the shared library (accent/case-insensitive) and any
  // repeats within this batch, so curated adds never create duplicates.
  const { data: existing } = await supabase.from("words").select("spanish").limit(10000);
  const have = new Set((existing ?? []).map((w) => normKey(w.spanish)));
  const seen = new Set<string>();
  const toAdd = clean.filter((w) => {
    const k = normKey(w.spanish);
    if (have.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (toAdd.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: clean.length });
  }

  // Words go into the shared library. `profile_id` records who added them.
  const { data: inserted, error: insertErr } = await supabase
    .from("words")
    .insert(toAdd)
    .select("id");
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Give the adder progress cards for the new words right away.
  await ensureCardsForProfile(profileId);

  // Time-release: push these words' due dates out so they surface later.
  if (availableInDays > 0 && inserted && inserted.length > 0) {
    const dueAt = new Date(Date.now() + availableInDays * 86400000).toISOString();
    await supabase
      .from("card_progress")
      .update({ due_at: dueAt })
      .eq("profile_id", profileId)
      .in(
        "word_id",
        inserted.map((w) => w.id)
      );
  }

  return NextResponse.json({ inserted: toAdd.length, skipped: clean.length - toAdd.length });
}
