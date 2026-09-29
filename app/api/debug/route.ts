import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";

export const dynamic = "force-dynamic";

// TEMPORARY diagnostic: does every library word have this profile's cards, and
// are the named words present + due? Remove after diagnosing.
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  const { data: words } = await supabase.from("words").select("id, spanish").limit(5000);
  const { data: cards } = await supabase
    .from("card_progress")
    .select("word_id, direction, due_at, last_reviewed_at, mastered")
    .eq("profile_id", profileId)
    .limit(20000);

  const dirsByWord = new Map<string, Set<string>>();
  for (const c of cards ?? []) {
    const s = dirsByWord.get(c.word_id) ?? new Set<string>();
    s.add(c.direction);
    dirsByWord.set(c.word_id, s);
  }

  const missing = (words ?? []).filter((w) => (dirsByWord.get(w.id)?.size ?? 0) < 2);

  const targets = ["Á tiempo", "Proximo ano", "Valer"];
  const named = targets.map((t) => {
    const w = (words ?? []).find((x) => x.spanish === t);
    if (!w) return { spanish: t, found: false };
    const cs = (cards ?? []).filter((c) => c.word_id === w.id);
    return {
      spanish: t,
      found: true,
      cards: cs.map((c) => ({
        direction: c.direction,
        due: c.due_at,
        lastReviewed: c.last_reviewed_at,
        mastered: c.mastered,
      })),
    };
  });

  return NextResponse.json({
    libraryWords: words?.length ?? 0,
    profileCards: cards?.length ?? 0,
    wordsMissingCards: missing.length,
    missingSample: missing.slice(0, 20).map((w) => w.spanish),
    named,
  });
}
