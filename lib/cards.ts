import { supabase, type Direction } from "./supabase";

const DIRECTIONS: Direction[] = ["es_to_en", "en_to_es"];

// The word library is shared across all profiles, but each profile keeps its
// own spaced-repetition progress. This makes sure the given profile has a
// card_progress row for every word in the library (both directions).
// Idempotent — safe to call on every read; new words self-heal into a profile.
export async function ensureCardsForProfile(profileId: string): Promise<void> {
  const { data: words } = await supabase.from("words").select("id");
  if (!words || words.length === 0) return;

  const { data: existing } = await supabase
    .from("card_progress")
    .select("word_id, direction")
    .eq("profile_id", profileId);

  const have = new Set((existing ?? []).map((c) => `${c.word_id}:${c.direction}`));

  const toInsert: { profile_id: string; word_id: string; direction: Direction }[] = [];
  for (const w of words) {
    for (const d of DIRECTIONS) {
      if (!have.has(`${w.id}:${d}`)) {
        toInsert.push({ profile_id: profileId, word_id: w.id, direction: d });
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("card_progress").upsert(toInsert, {
      onConflict: "profile_id,word_id,direction",
      ignoreDuplicates: true,
    });
  }
}
