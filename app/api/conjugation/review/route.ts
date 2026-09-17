import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nextState } from "@/lib/srs";
import { getProfileId } from "@/lib/profile";

export const dynamic = "force-dynamic";

// POST /api/conjugation/review { card_key, gotIt } — SRS update for one card.
export async function POST(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  let body: { card_key?: string; gotIt?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { card_key, gotIt } = body;
  if (!card_key || typeof gotIt !== "boolean") {
    return NextResponse.json(
      { error: "card_key and gotIt (boolean) are required" },
      { status: 400 }
    );
  }

  const { data: card, error: fetchErr } = await supabase
    .from("conjugation_progress")
    .select("interval_days, ease_factor, repetitions")
    .eq("profile_id", profileId)
    .eq("card_key", card_key)
    .single();

  if (fetchErr || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const update = nextState(card, gotIt);
  const { error: updateErr } = await supabase
    .from("conjugation_progress")
    .update(update)
    .eq("profile_id", profileId)
    .eq("card_key", card_key);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mastered: update.mastered });
}
