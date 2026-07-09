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
  flag,
  label,
  color,
  due,
  mastered,
}: {
  direction: Direction;
  flag: string;
  label: string;
  color: "tang" | "teal";
  due: number;
  mastered: number;
}) {
  const styles = {
    tang: {
      card: "bg-tang",
      btn: "bg-white text-tang",
    },
    teal: {
      card: "bg-teal",
      btn: "bg-white text-teal-dark",
    },
  }[color];

  return (
    <Link
      href={`/study?direction=${direction}`}
      className={`group block rounded-3xl ${styles.card} p-6 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm`}
    >
      <div className="text-3xl">{flag}</div>
      <div className="mt-2 font-display text-lg font-600" style={{ fontWeight: 600 }}>
        {label}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-5xl font-700" style={{ fontWeight: 700 }}>
          {due}
        </span>
        <span className="text-sm font-bold opacity-90">due now</span>
      </div>
      <div className="mt-1 text-xs font-semibold opacity-80">
        ✓ {mastered} mastered
      </div>
      <div
        className={`mt-5 inline-block rounded-full ${styles.btn} px-5 py-2 text-sm font-800 shadow-pop-sm transition group-hover:-translate-y-0.5`}
        style={{ fontWeight: 800 }}
      >
        {due > 0 ? "Start studying →" : "Review anyway →"}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="animate-pop-in">
      <h1 className="font-display text-4xl font-700 text-ink" style={{ fontWeight: 700 }}>
        ¡Hola! 👋
      </h1>
      <p className="mt-1 text-lg font-semibold text-ink/60">
        You've got{" "}
        <span className="text-tang">{stats.totalWords}</span> word
        {stats.totalWords === 1 ? "" : "s"} in your deck. Pick a direction and go.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StudyCard
          direction="es_to_en"
          flag="🇪🇸 → 🇬🇧"
          label="Spanish → English"
          color="tang"
          due={stats.due.es_to_en}
          mastered={stats.mastered.es_to_en}
        />
        <StudyCard
          direction="en_to_es"
          flag="🇬🇧 → 🇪🇸"
          label="English → Spanish"
          color="teal"
          due={stats.due.en_to_es}
          mastered={stats.mastered.en_to_es}
        />
      </div>

      <div className="mt-6">
        <Link
          href="/add"
          className="inline-flex items-center gap-2 rounded-full bg-sunny px-6 py-3 font-800 text-ink shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          <span className="text-xl">➕</span> Add words from a lesson
        </Link>
      </div>
    </div>
  );
}
