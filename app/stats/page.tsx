"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const CARDS_PER_BATCH = 20;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

interface DayBar {
  date: string; // YYYY-MM-DD (local)
  label: string; // e.g. "7/14"
  cards: number;
  batches: number;
}

export default function StatsPage() {
  const [reviewedAt, setReviewedAt] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReviewedAt(data.reviewedAt ?? []);
      })
      .catch((e) => setError(e.message || "Failed to load"));
  }, []);

  const { days, totalCards, totalBatches, streak, bestBatches } = useMemo(() => {
    const empty = {
      days: [] as DayBar[],
      totalCards: 0,
      totalBatches: 0,
      streak: 0,
      bestBatches: 0,
    };
    if (!reviewedAt || reviewedAt.length === 0) return empty;

    // Bucket each review into its LOCAL calendar day.
    const counts = new Map<string, number>();
    for (const ts of reviewedAt) {
      const key = ymd(new Date(ts));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const first = parseYmd([...counts.keys()].sort()[0]);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const days: DayBar[] = [];
    for (let d = first; d <= today; d = addDays(d, 1)) {
      const key = ymd(d);
      const cards = counts.get(key) ?? 0;
      days.push({
        date: key,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        cards,
        batches: cards / CARDS_PER_BATCH,
      });
    }

    const totalCards = reviewedAt.length;
    const totalBatches = totalCards / CARDS_PER_BATCH;
    const bestBatches = Math.max(...days.map((d) => d.batches));

    // Current streak: consecutive active days ending today (or yesterday).
    let streak = 0;
    let cursor = today;
    if ((counts.get(ymd(today)) ?? 0) === 0 && (counts.get(ymd(addDays(today, -1))) ?? 0) > 0) {
      cursor = addDays(today, -1);
    }
    while ((counts.get(ymd(cursor)) ?? 0) > 0) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    return { days, totalCards, totalBatches, streak, bestBatches };
  }, [reviewedAt]);

  if (error) {
    return <p className="rounded-2xl bg-white p-6 font-bold text-tang shadow-pop">Error: {error}</p>;
  }
  if (!reviewedAt) {
    return <p className="text-lg font-bold text-ink/50">Loading…</p>;
  }

  if (days.length === 0) {
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-5xl">📊</div>
        <p className="mt-3 font-bold text-ink/60">No study history yet.</p>
        <p className="mt-1 text-sm font-semibold text-ink/50">
          Complete a study session and your daily batches will show up here.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full bg-tang px-6 py-3 font-800 text-white shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Go study →
        </Link>
      </div>
    );
  }

  // Show the most recent 60 days.
  const shown = days.slice(-60);
  const maxCards = Math.max(1, ...shown.map((d) => d.cards));

  return (
    <div className="animate-pop-in">
      <h1 className="font-display text-3xl font-700 text-ink" style={{ fontWeight: 700 }}>
        Daily practice 📈
      </h1>
      <p className="mt-1 font-semibold text-ink/60">
        Batches you've completed each day. <span className="text-ink/40">1 batch = 20 cards.</span>
      </p>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-pop-sm">
          <div className="font-display text-3xl font-700 text-tang" style={{ fontWeight: 700 }}>
            {totalBatches.toFixed(1)}
          </div>
          <div className="text-xs font-bold text-ink/50">total batches</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-pop-sm">
          <div className="font-display text-3xl font-700 text-teal-dark" style={{ fontWeight: 700 }}>
            {streak}🔥
          </div>
          <div className="text-xs font-bold text-ink/50">day streak</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-pop-sm">
          <div className="font-display text-3xl font-700 text-grape" style={{ fontWeight: 700 }}>
            {bestBatches.toFixed(1)}
          </div>
          <div className="text-xs font-bold text-ink/50">best day</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-pop">
        <div className="overflow-x-auto">
          <div className="flex h-52 items-end gap-1.5" style={{ minWidth: shown.length * 22 }}>
            {shown.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end" style={{ minWidth: 18 }}>
                <div className="mb-1 text-[10px] font-bold text-ink/40">
                  {d.cards > 0 ? d.batches.toFixed(d.batches < 1 ? 1 : d.batches % 1 === 0 ? 0 : 1) : ""}
                </div>
                <div
                  className={`w-full rounded-t-md ${d.cards > 0 ? "bg-gradient-to-t from-tang to-sunny" : "bg-ink/5"}`}
                  style={{ height: `${d.cards > 0 ? Math.max(4, (d.cards / maxCards) * 100) : 2}%` }}
                  title={`${d.label} — ${d.cards} card${d.cards === 1 ? "" : "s"} (${d.batches.toFixed(1)} batches)`}
                />
              </div>
            ))}
          </div>
          {/* Date labels: every ~7th day to avoid crowding */}
          <div className="mt-2 flex gap-1.5" style={{ minWidth: shown.length * 22 }}>
            {shown.map((d, i) => (
              <div key={d.date} className="flex-1 text-center text-[9px] font-bold text-ink/35" style={{ minWidth: 18 }}>
                {i % 7 === 0 || i === shown.length - 1 ? d.label : ""}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-ink/40">
        Each bar shows the batches you completed that day (a partial batch, e.g. 0.6, means fewer than
        20 cards were due). Only your first answer on each card counts — repeat drills don't inflate it.
      </p>
    </div>
  );
}
