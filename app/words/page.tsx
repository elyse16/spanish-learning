import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase, type Direction } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureCardsForProfile } from "@/lib/cards";
import WordsTable, { type WordRow } from "./WordsTable";

export const dynamic = "force-dynamic";

async function getRows(profileId: string): Promise<WordRow[]> {
  await ensureCardsForProfile(profileId);

  // Words are the shared library; you can only edit/delete ones you added.
  const { data: words } = await supabase
    .from("words")
    .select("id, spanish, english, profile_id")
    .order("created_at", { ascending: false });

  const { data: cards } = await supabase
    .from("card_progress")
    .select("word_id, direction, mastered, interval_days")
    .eq("profile_id", profileId);

  const byWord = new Map<string, WordRow>();
  for (const w of words ?? []) {
    byWord.set(w.id, {
      id: w.id,
      spanish: w.spanish,
      english: w.english,
      editable: w.profile_id === profileId,
      status: { es_to_en: undefined, en_to_es: undefined },
    });
  }
  for (const c of cards ?? []) {
    const row = byWord.get(c.word_id);
    if (row) {
      row.status[c.direction as Direction] = {
        mastered: c.mastered,
        interval_days: c.interval_days,
      };
    }
  }
  return Array.from(byWord.values());
}

export default async function WordsPage() {
  const profileId = getProfileId();
  if (!profileId) redirect("/profiles");
  const rows = await getRows(profileId);

  return (
    <div className="animate-pop-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-700 text-ink" style={{ fontWeight: 700 }}>
          All words
        </h1>
        <Link
          href="/add"
          className="rounded-full bg-sunny px-4 py-2 text-sm font-800 text-ink shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          ➕ Add words
        </Link>
      </div>

      <WordsTable initialRows={rows} />
    </div>
  );
}
