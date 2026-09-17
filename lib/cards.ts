import { supabase, type Direction } from "./supabase";
import { CONJ_CARDS } from "./conjugation";

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

// Ensure the profile has a progress row for every conjugation card in the
// catalog. The catalog lives in code (lib/conjugation.ts), keyed by card_key.
export async function ensureConjugationCards(profileId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("conjugation_progress")
    .select("card_key")
    .eq("profile_id", profileId);

  const have = new Set((existing ?? []).map((c) => c.card_key));
  const toInsert = CONJ_CARDS.filter((c) => !have.has(c.key)).map((c) => ({
    profile_id: profileId,
    card_key: c.key,
  }));

  if (toInsert.length > 0) {
    await supabase.from("conjugation_progress").upsert(toInsert, {
      onConflict: "profile_id,card_key",
      ignoreDuplicates: true,
    });
  }
}
