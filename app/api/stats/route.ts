import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";
import { bucketByStage } from "@/lib/progress";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

async function dueCount(profileId: string, direction: Direction, nowIso: string): Promise<number> {
  const { count } = await supabase
    .from("card_progress")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("direction", direction)
    .eq("mastered", false)
    .lte("due_at", nowIso);
  return count ?? 0;
}

async function masteredCount(profileId: string, direction: Direction): Promise<number> {
  const { count } = await supabase
    .from("card_progress")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("direction", direction)
    .eq("mastered", true);
  return count ?? 0;
}

// GET /api/stats — counts for the dashboard.
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  await ensureCardsForProfile(profileId);
  const nowIso = new Date().toISOString();

  // The word library is shared across all profiles.
  const { count: totalWords } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true });

  const { data: allCards } = await supabase
    .from("card_progress")
    .select("word_id, mastered, interval_days, repetitions")
    .eq("profile_id", profileId);

  const [dueEsEn, dueEnEs, masteredEsEn, masteredEnEs] = await Promise.all([
    dueCount(profileId, "es_to_en", nowIso),
    dueCount(profileId, "en_to_es", nowIso),
    masteredCount(profileId, "es_to_en"),
    masteredCount(profileId, "en_to_es"),
  ]);

  return NextResponse.json({
    totalWords: totalWords ?? 0,
    due: { es_to_en: dueEsEn, en_to_es: dueEnEs },
    mastered: { es_to_en: masteredEsEn, en_to_es: masteredEnEs },
    progress: bucketByStage(allCards ?? []),
  });
}
