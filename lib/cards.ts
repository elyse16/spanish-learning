import { supabase, type Direction } from "./supabase";
import { CONJ_VERBS } from "./conjugation";

const DIRECTIONS: Direction[] = ["es_to_en", "en_to_es"];

// PostgREST caps a single response at 1000 rows. This pages through a query via
// .range() until a short page comes back, so callers always get every row.
const PAGE = 1000;
async function selectAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

// The word library is shared across all profiles, but each profile keeps its
// own spaced-repetition progress. This makes sure the given profile has a
// card_progress row for every word in the library (both directions).
// Idempotent — safe to call on every read; new words self-heal into a profile.
export async function ensureCardsForProfile(profileId: string): Promise<void> {
  const words = await selectAll<{ id: string }>((from, to) =>
    supabase.from("words").select("id").range(from, to)
  );
  if (words.length === 0) return;

  // Page through ALL existing cards. PostgREST caps a response at 1000 rows, so
  // once a profile has >1000 cards an un-paginated read returns a partial set —
  // which used to make this both miss new words and re-insert duplicates.
  const existing = await selectAll<{ word_id: string; direction: Direction }>((from, to) =>
    supabase
      .from("card_progress")
      .select("word_id, direction")
      .eq("profile_id", profileId)
      .range(from, to)
  );

  const have = new Set(existing.map((c) => `${c.word_id}:${c.direction}`));

  const toInsert: { profile_id: string; word_id: string; direction: Direction }[] = [];
  for (const w of words) {
    for (const d of DIRECTIONS) {
      const k = `${w.id}:${d}`;
      if (!have.has(k)) {
        toInsert.push({ profile_id: profileId, word_id: w.id, direction: d });
        have.add(k); // guard against duplicate words in the source list
      }
    }
  }

  // Insert only the rows we computed as missing. Plain insert (not upsert)
  // because it doesn't depend on a specific unique constraint existing.
  if (toInsert.length > 0) {
    await supabase.from("card_progress").insert(toInsert);
  }
}

// Ensure the profile has a progress row for every conjugation VERB in the
// catalog (keyed by card_key), and prune any stale keys from earlier versions
// of the catalog (e.g. the old per-person cards). Self-migrating on load.
export async function ensureConjugationCards(profileId: string): Promise<void> {
  const catalogKeys = new Set(CONJ_VERBS.map((v) => v.key));

  const { data: existing } = await supabase
    .from("conjugation_progress")
    .select("card_key")
    .eq("profile_id", profileId);

  const existingKeys = (existing ?? []).map((c) => c.card_key);

  const stale = existingKeys.filter((k) => !catalogKeys.has(k));
  if (stale.length > 0) {
    await supabase
      .from("conjugation_progress")
      .delete()
      .eq("profile_id", profileId)
      .in("card_key", stale);
  }

  const have = new Set(existingKeys.filter((k) => catalogKeys.has(k)));
  const toInsert = CONJ_VERBS.filter((v) => !have.has(v.key)).map((v) => ({
    profile_id: profileId,
    card_key: v.key,
  }));
  if (toInsert.length > 0) {
    await supabase.from("conjugation_progress").insert(toInsert);
  }
}
