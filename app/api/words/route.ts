import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

interface IncomingWord {
  spanish: string;
  english: string;
}

// POST /api/words — bulk insert words and create both direction cards for each.
export async function POST(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

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
      profile_id: profileId,
    }))
    .filter((w) => w.spanish && w.english);

  if (clean.length === 0) {
    return NextResponse.json(
      { error: "No valid words. Each word needs both a Spanish and English value." },
      { status: 400 }
    );
  }

  // Words go into the shared library. `profile_id` records who added them.
  const { error: insertErr } = await supabase.from("words").insert(clean);
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Give the adder progress cards for the new words right away; other profiles
  // pick them up lazily on their next study/dashboard load.
  await ensureCardsForProfile(profileId);

  return NextResponse.json({ inserted: clean.length });
}
