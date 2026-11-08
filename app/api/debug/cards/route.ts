import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";

export const dynamic = "force-dynamic";

const PAGE = 1000;
async function selectAll<T>(
  q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await q(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

// TEMP diagnostic: are all words carded for this profile (both directions),
// and are there duplicate cards? Remove after checking.
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) return NextResponse.json({ error: "No profile selected" }, { status: 401 });

  const words = await selectAll<{ id: string; spanish: string }>((f, t) =>
    supabase.from("words").select("id, spanish").range(f, t)
  );
  const cards = await selectAll<{ word_id: string; direction: string }>((f, t) =>
    supabase.from("card_progress").select("word_id, direction").eq("profile_id", profileId).range(f, t)
  );

  const count = new Map<string, number>();
  for (const c of cards) count.set(`${c.word_id}:${c.direction}`, (count.get(`${c.word_id}:${c.direction}`) ?? 0) + 1);

  const missing: string[] = [];
  let dupPairs = 0;
  let dupExtraRows = 0;
  const wordById = new Map(words.map((w) => [w.id, w.spanish]));
  for (const w of words) {
    for (const d of ["es_to_en", "en_to_es"]) {
      const n = count.get(`${w.id}:${d}`) ?? 0;
      if (n === 0) missing.push(`${w.spanish} (${d})`);
    }
  }
  for (const [key, n] of count) {
    if (n > 1) {
      dupPairs += 1;
      dupExtraRows += n - 1;
    }
  }

  return NextResponse.json({
    words: words.length,
    cardRows: cards.length,
    expectedCardRows: words.length * 2,
    missingCount: missing.length,
    missingSample: missing.slice(0, 40),
    duplicatePairs: dupPairs,
    duplicateExtraRows: dupExtraRows,
    _wordByIdSize: wordById.size,
  });
}
