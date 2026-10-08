import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";

export const dynamic = "force-dynamic";

// TEMP read-only debug endpoint: reports due_at for every word's cards so we can
// verify the curated time-release schedule. Remove after checking.
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("card_progress")
    .select("direction, due_at, last_reviewed_at, mastered, words!inner(spanish)")
    .eq("profile_id", profileId)
    .eq("direction", "es_to_en")
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r) => {
    const w = Array.isArray(r.words) ? r.words[0] : r.words;
    return {
      spanish: w?.spanish ?? "",
      due_at: r.due_at as string | null,
      mastered: r.mastered as boolean,
      dueNow: r.due_at != null && r.due_at <= nowIso && !r.mastered,
    };
  });

  const dueNowCount = rows.filter((r) => r.dueNow).length;
  const nullDue = rows.filter((r) => r.due_at == null).length;
  const futureDue = rows.filter((r) => r.due_at != null && r.due_at > nowIso).length;

  return NextResponse.json({
    now: nowIso,
    total: rows.length,
    dueNowCount,
    nullDue,
    futureDue,
    rows,
  });
}

// TEMP fix action: ensure cards exist for all library words, then set due_at
// (both directions) for the given groups to now + availableInDays. Remove after.
// Body: { groups: [{ spanish: string[], availableInDays: number }] }
export async function POST(req: Request) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }
  const body = (await req.json()) as {
    groups?: { spanish: string[]; availableInDays: number }[];
  };
  const groups = body.groups ?? [];

  // Make sure every library word (incl. any batch whose cards never got made)
  // has card_progress rows before we set their due dates.
  await ensureCardsForProfile(profileId);

  const results: { availableInDays: number; matched: number; updated: number; missing: string[] }[] = [];

  for (const g of groups) {
    const dueAt = new Date(Date.now() + Math.max(0, g.availableInDays) * 86400000).toISOString();
    const { data: words } = await supabase
      .from("words")
      .select("id, spanish")
      .in("spanish", g.spanish);
    const foundSpanish = new Set((words ?? []).map((w) => w.spanish));
    const missing = g.spanish.filter((s) => !foundSpanish.has(s));
    const ids = (words ?? []).map((w) => w.id);

    let updated = 0;
    if (ids.length > 0) {
      const { data: upd, error } = await supabase
        .from("card_progress")
        .update({ due_at: dueAt })
        .eq("profile_id", profileId)
        .in("word_id", ids)
        .select("id");
      if (error) return NextResponse.json({ error: error.message, at: g.availableInDays }, { status: 500 });
      updated = (upd ?? []).length;
    }
    results.push({ availableInDays: g.availableInDays, matched: ids.length, updated, missing });
  }

  return NextResponse.json({ ok: true, now: new Date().toISOString(), results });
}
