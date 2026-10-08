import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";

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
