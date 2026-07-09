import Link from "next/link";
import { supabase, type Direction } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getStats() {
  const nowIso = new Date().toISOString();

  const { count: totalWords } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true });

  async function due(direction: Direction) {
    const { count } = await supabase
      .from("card_progress")
      .select("id", { count: "exact", head: true })
      .eq("direction", direction)
      .eq("mastered", false)
      .lte("due_at", nowIso);
    return count ?? 0;
  }

  async function mastered(direction: Direction) {
    const { count } = await supabase
      .from("card_progress")
      .select("id", { count: "exact", head: true })
      .eq("direction", direction)
      .eq("mastered", true);
    return count ?? 0;
  }

  const [dueEsEn, dueEnEs, mEsEn, mEnEs] = await Promise.all([
    due("es_to_en"),
    due("en_to_es"),
    mastered("es_to_en"),
    mastered("en_to_es"),
  ]);

  return {
    totalWords: totalWords ?? 0,
    due: { es_to_en: dueEsEn, en_to_es: dueEnEs },
    mastered: { es_to_en: mEsEn, en_to_es: mEnEs },
  };
}

function StudyCard({
  direction,
  label,
  due,
  mastered,
}: {
  direction: Direction;
  label: string;
  due: number;
  mastered: number;
}) {
  return (
    <Link
      href={`/study?direction=${direction}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand hover:shadow-md"
    >
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-brand">{due}</span>
        <span className="text-sm text-slate-500">due now</span>
      </div>
      <div className="mt-1 text-xs text-slate-400">{mastered} mastered</div>
      <div className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
        {due > 0 ? "Start studying →" : "Review anyway →"}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-slate-500">
        {stats.totalWords} word{stats.totalWords === 1 ? "" : "s"} in your deck.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StudyCard
          direction="es_to_en"
          label="Spanish → English"
          due={stats.due.es_to_en}
          mastered={stats.mastered.es_to_en}
        />
        <StudyCard
          direction="en_to_es"
          label="English → Spanish"
          due={stats.due.en_to_es}
          mastered={stats.mastered.en_to_es}
        />
      </div>

      <div className="mt-8">
        <Link
          href="/add"
          className="inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          + Add words from a lesson
        </Link>
      </div>
    </div>
  );
}
