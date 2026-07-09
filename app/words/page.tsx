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
  if (!s) return <span className="text-ink/20">—</span>;
  if (s.mastered)
    return (
      <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-xs font-800 text-teal-dark" style={{ fontWeight: 800 }}>
        ✓ mastered
      </span>
    );
  if (s.interval_days === 0)
    return (
      <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-800 text-ink/50" style={{ fontWeight: 800 }}>
        ✦ new
      </span>
    );
  return (
    <span className="rounded-full bg-sunny/25 px-2.5 py-0.5 text-xs font-800 text-sunny-dark" style={{ fontWeight: 800 }}>
      {s.interval_days}d
    </span>
  );
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
      <p className="mt-1 font-semibold text-ink/50">{rows.length} total</p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-pop">
          <div className="text-5xl">📭</div>
          <p className="mt-3 font-bold text-ink/60">No words yet.</p>
          <Link
            href="/add"
            className="mt-4 inline-block rounded-full bg-tang px-6 py-3 font-800 text-white shadow-pop-sm"
            style={{ fontWeight: 800 }}
          >
            Add some from a lesson →
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-pop">
          <table className="w-full text-sm">
            <thead className="text-left font-800 text-ink/50" style={{ fontWeight: 800 }}>
              <tr className="border-b-2 border-ink/5">
                <th className="px-4 py-3">Spanish</th>
                <th className="px-4 py-3">English</th>
                <th className="px-4 py-3">ES→EN</th>
                <th className="px-4 py-3">EN→ES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 font-bold text-ink">{r.spanish}</td>
                  <td className="px-4 py-3 text-ink/60">{r.english}</td>
                  <td className="px-4 py-3">
                    <StatusBadge s={r.status.es_to_en} />
                  </td>
                  <td className="px-4 py-3">
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
