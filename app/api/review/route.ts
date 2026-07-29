import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nextState } from "@/lib/srs";
import { getProfileId } from "@/lib/profile";

export const dynamic = "force-dynamic";

// POST /api/review  { card_id: string, gotIt: boolean }
// Applies the SRS update for a single card.
export async function POST(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  let body: { card_id?: string; gotIt?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { card_id, gotIt } = body;
  if (!card_id || typeof gotIt !== "boolean") {
    return NextResponse.json(
      { error: "card_id and gotIt (boolean) are required" },
      { status: 400 }
    );
  }

  const { data: card, error: fetchErr } = await supabase
    .from("card_progress")
    .select("interval_days, ease_factor, repetitions, direction")
    .eq("id", card_id)
    .eq("profile_id", profileId)
    .single();

  if (fetchErr || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const update = nextState(card, gotIt);

  const { error: updateErr } = await supabase
    .from("card_progress")
    .update(update)
    .eq("id", card_id)
    .eq("profile_id", profileId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Log the review for progress-over-time analytics. Best-effort: a logging
  // failure should never fail the review itself.
  await supabase.from("reviews").insert({
    card_id,
    direction: card.direction,
    got_it: gotIt,
    profile_id: profileId,
  });

  return NextResponse.json({ ok: true, mastered: update.mastered });
}
