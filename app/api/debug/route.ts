import { NextResponse } from "next/server";
import { supabase, type Direction } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";

export const dynamic = "force-dynamic";
const DIRECTIONS: Direction[] = ["es_to_en", "en_to_es"];

// TEMPORARY: recompute missing cards, run the insert with error reporting.
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }

  const { data: words } = await supabase.from("words").select("id").limit(10000);
  const { data: existing } = await supabase
    .from("card_progress")
    .select("word_id, direction")
    .eq("profile_id", profileId)
    .limit(50000);

  const have = new Set((existing ?? []).map((c) => `${c.word_id}:${c.direction}`));
  const toInsert: { profile_id: string; word_id: string; direction: Direction }[] = [];
  for (const w of words ?? []) {
    for (const d of DIRECTIONS) {
      if (!have.has(`${w.id}:${d}`)) {
        toInsert.push({ profile_id: profileId, word_id: w.id, direction: d });
      }
    }
  }

  const before = existing?.length ?? 0;

  // Try the upsert exactly as the app does, but capture the error.
  const upsertRes = await supabase.from("card_progress").upsert(toInsert, {
    onConflict: "profile_id,word_id,direction",
    ignoreDuplicates: true,
  });

  // Also try a plain insert as a fallback probe (may conflict — that's fine).
  let plainErr: string | null = null;
  if (upsertRes.error) {
    const plain = await supabase.from("card_progress").insert(toInsert);
    plainErr = plain.error ? plain.error.message : "plain insert OK";
  }

  const { count: after } = await supabase
    .from("card_progress")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);

  return NextResponse.json({
    words: words?.length ?? 0,
    cardsBefore: before,
    toInsert: toInsert.length,
    upsertError: upsertRes.error ? upsertRes.error.message : null,
    plainInsertResult: plainErr,
    cardsAfter: after ?? 0,
  });
}
