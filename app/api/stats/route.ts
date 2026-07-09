import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function dueCount(direction: Direction, nowIso: string): Promise<number> {
  const { count } = await supabase
    .from("card_progress")
    .select("id", { count: "exact", head: true })
    .eq("direction", direction)
    .eq("mastered", false)
    .lte("due_at", nowIso);
  return count ?? 0;
}

async function masteredCount(direction: Direction): Promise<number> {
  const { count } = await supabase
    .from("card_progress")
    .select("id", { count: "exact", head: true })
    .eq("direction", direction)
    .eq("mastered", true);
  return count ?? 0;
}

// GET /api/stats — counts for the dashboard.
export async function GET() {
  const nowIso = new Date().toISOString();

  const { count: totalWords } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true });

  const [dueEsEn, dueEnEs, masteredEsEn, masteredEnEs] = await Promise.all([
    dueCount("es_to_en", nowIso),
    dueCount("en_to_es", nowIso),
    masteredCount("es_to_en"),
    masteredCount("en_to_es"),
  ]);

  return NextResponse.json({
    totalWords: totalWords ?? 0,
    due: { es_to_en: dueEsEn, en_to_es: dueEnEs },
    mastered: { es_to_en: masteredEsEn, en_to_es: masteredEnEs },
  });
}
