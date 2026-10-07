import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureConjugationCards } from "@/lib/cards";
import { cardStage } from "@/lib/progress";
import { TENSES, tenseOfKey, type TenseId } from "@/lib/conjugation";

export const dynamic = "force-dynamic";

// GET /api/conjugation/summary — per-tense due counts + progress buckets.
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  await ensureConjugationCards(profileId);

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("conjugation_progress")
    .select("card_key, mastered, interval_days, repetitions, due_at")
    .eq("profile_id", profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Bucket = { due: number; new: number; learning: number; mastered: number; total: number };
  const byTense: Record<TenseId, Bucket> = {
    preterite: { due: 0, new: 0, learning: 0, mastered: 0, total: 0 },
    future: { due: 0, new: 0, learning: 0, mastered: 0, total: 0 },
    imperfect: { due: 0, new: 0, learning: 0, mastered: 0, total: 0 },
  };

  for (const row of data ?? []) {
    const tense = tenseOfKey(row.card_key);
    if (!tense) continue;
    const b = byTense[tense];
    b.total += 1;
    b[cardStage(row)] += 1;
    if (!row.mastered && row.due_at <= nowIso) b.due += 1;
  }

  return NextResponse.json({
    tenses: TENSES.map((t) => ({ ...t, ...byTense[t.id] })),
  });
}
