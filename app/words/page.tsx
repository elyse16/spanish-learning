import Link from "next/link";
import { supabase, type Direction } from "@/lib/supabase";
import WordsTable, { type WordRow } from "./WordsTable";

export const dynamic = "force-dynamic";

async function getRows(): Promise<WordRow[]> {
  const { data: words } = await supabase
    .from("words")
    .select("id, spanish, english")
    .order("created_at", { ascending: false });

  const { data: cards } = await supabase
    .from("card_progress")
    .select("word_id, direction, mastered, interval_days");

  const byWord = new Map<string, WordRow>();
  for (const w of words ?? []) {
    byWord.set(w.id, {
      id: w.id,
      spanish: w.spanish,
      english: w.english,
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
  const rows = await getRows();

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
