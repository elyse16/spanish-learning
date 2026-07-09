import Link from "next/link";
import { supabase, type Direction } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface Row {
  spanish: string;
  english: string;
  status: Record<Direction, { mastered: boolean; interval_days: number } | undefined>;
}

async function getRows(): Promise<Row[]> {
  const { data: words } = await supabase
    .from("words")
    .select("id, spanish, english")
    .order("created_at", { ascending: false });

  const { data: cards } = await supabase
    .from("card_progress")
    .select("word_id, direction, mastered, interval_days");

  const byWord = new Map<string, Row>();
  for (const w of words ?? []) {
    byWord.set(w.id, {
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

function StatusBadge({
  s,
}: {
  s: { mastered: boolean; interval_days: number } | undefined;
}) {
  if (!s) return <span className="text-slate-300">—</span>;
  if (s.mastered)
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        mastered
      </span>
    );
  if (s.interval_days === 0)
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        new
      </span>
    );
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      {s.interval_days}d
    </span>
  );
}

export default async function WordsPage() {
  const rows = await getRows();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All words</h1>
        <Link href="/add" className="text-sm font-semibold text-brand underline">
          + Add words
        </Link>
      </div>
      <p className="mt-1 text-slate-500">{rows.length} total</p>

      {rows.length === 0 ? (
        <p className="mt-6 text-slate-500">
          No words yet.{" "}
          <Link href="/add" className="font-semibold text-brand underline">
            Add some from a lesson.
          </Link>
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Spanish</th>
                <th className="px-3 py-2">English</th>
                <th className="px-3 py-2">ES→EN</th>
                <th className="px-3 py-2">EN→ES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{r.spanish}</td>
                  <td className="px-3 py-2 text-slate-600">{r.english}</td>
                  <td className="px-3 py-2">
                    <StatusBadge s={r.status.es_to_en} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge s={r.status.en_to_es} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
