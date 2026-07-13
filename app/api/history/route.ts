import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/history — daily review aggregates for progress-over-time graphs.
export async function GET() {
  const { data, error } = await supabase
    .from("reviews")
    .select("reviewed_at, got_it, card_id")
    .order("reviewed_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const byDay = new Map<string, { reviews: number; correct: number }>();
  const cumulativeByDay = new Map<string, number>();
  const seenCards = new Set<string>();

  for (const r of rows) {
    const date = new Date(r.reviewed_at).toISOString().slice(0, 10); // UTC day
    const d = byDay.get(date) ?? { reviews: 0, correct: 0 };
    d.reviews += 1;
    if (r.got_it) d.correct += 1;
    byDay.set(date, d);
    seenCards.add(r.card_id);
    cumulativeByDay.set(date, seenCards.size); // last write per day = end-of-day total
  }

  const days = Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    reviews: v.reviews,
    correct: v.correct,
    accuracy: v.reviews > 0 ? Math.round((v.correct / v.reviews) * 100) : 0,
    cumulativeCards: cumulativeByDay.get(date) ?? 0,
  }));

  return NextResponse.json({
    totalReviews: rows.length,
    totalCorrect: rows.filter((r) => r.got_it).length,
    distinctCards: seenCards.size,
    days,
  });
}
