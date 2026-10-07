import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";
import { ensureConjugationCards } from "@/lib/cards";
import { cardStage } from "@/lib/progress";
import { TENSES, tenseOfKey, type TenseId } from "@/lib/conjugation";

export const dynamic = "force-dynamic";

interface TenseStat {
  due: number;
  mastered: number;
  learning: number;
  new: number;
  total: number;
}

async function getTenseStats(profileId: string): Promise<Record<TenseId, TenseStat>> {
  await ensureConjugationCards(profileId);
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("conjugation_progress")
    .select("card_key, mastered, interval_days, repetitions, due_at")
    .eq("profile_id", profileId);

  const stats: Record<TenseId, TenseStat> = {
    preterite: { due: 0, mastered: 0, learning: 0, new: 0, total: 0 },
    future: { due: 0, mastered: 0, learning: 0, new: 0, total: 0 },
    imperfect: { due: 0, mastered: 0, learning: 0, new: 0, total: 0 },
  };
  for (const row of data ?? []) {
    const tense = tenseOfKey(row.card_key);
    if (!tense) continue;
    const s = stats[tense];
    s.total += 1;
    s[cardStage(row)] += 1;
    if (!row.mastered && row.due_at <= nowIso) s.due += 1;
  }
  return stats;
}

const COLORS = ["bg-grape", "bg-teal", "bg-tang"];

export default async function ConjugatePickerPage() {
  const profileId = getProfileId();
  if (!profileId) redirect("/profiles");
  const stats = await getTenseStats(profileId);

  return (
    <div className="animate-pop-in">
      <h1 className="font-display text-3xl font-700 text-ink" style={{ fontWeight: 700 }}>
        Conjugations 🔀
      </h1>
      <p className="mt-1 font-semibold text-ink/60">Pick a tense to practice.</p>

      <div className="mt-6 grid gap-4">
        {TENSES.map((t, i) => {
          const s = stats[t.id];
          return (
            <Link
              key={t.id}
              href={`/conjugate/${t.id}`}
              className={`group block rounded-3xl ${COLORS[i % COLORS.length]} p-6 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-xl font-600" style={{ fontWeight: 600 }}>
                    {t.emoji} {t.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold opacity-80">{t.blurb}</div>
                  <div className="mt-3 text-xs font-semibold opacity-80">
                    🏆 {s.mastered} mastered · 📚 {s.learning} learning · 🌱 {s.new} new
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-5xl font-700" style={{ fontWeight: 700 }}>
                    {s.due}
                  </div>
                  <div className="text-xs font-bold opacity-90">due now</div>
                </div>
              </div>
              <div
                className="mt-4 inline-block rounded-full bg-white/90 px-5 py-2 text-sm font-800 text-ink shadow-pop-sm transition group-hover:-translate-y-0.5"
                style={{ fontWeight: 800 }}
              >
                {s.due > 0 ? "Practice →" : "Review anyway →"}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
