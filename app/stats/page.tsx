"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const CARDS_PER_BATCH = 20;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

// Colour level from number of sets (batches). 4+ sets = full green (the goal).
const LEVEL_BG = ["bg-ink/5", "bg-teal/25", "bg-teal/45", "bg-teal/70", "bg-teal"];
function levelFor(sets: number): number {
  if (sets <= 0) return 0;
  if (sets < 1) return 1;
  if (sets < 2) return 2;
  if (sets < 4) return 3;
  return 4;
}

interface Cell {
  date: string;
  sets: number;
  future: boolean;
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

  const { weeks, totalBatches, streak, bestBatches, goalDays, hasData } = useMemo(() => {
    const empty = {
      weeks: [] as Cell[][],
      totalBatches: 0,
      streak: 0,
      bestBatches: 0,
      goalDays: 0,
      hasData: false,
    };
    if (!reviewedAt || reviewedAt.length === 0) return empty;

    // Cards per LOCAL calendar day.
    const cards = new Map<string, number>();
    for (const ts of reviewedAt) {
      const key = ymd(new Date(ts));
      cards.set(key, (cards.get(key) ?? 0) + 1);
    }
    const setsFor = (key: string) => (cards.get(key) ?? 0) / CARDS_PER_BATCH;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const first = parseYmd([...cards.keys()].sort()[0]);
    // Grid starts on the Sunday on/before the first active day.
    const gridStart = addDays(first, -first.getDay());

    const weeks: Cell[][] = [];
    let cur = gridStart;
    while (cur <= today) {
      const week: Cell[] = [];
      for (let i = 0; i < 7; i++) {
        const key = ymd(cur);
        week.push({ date: key, sets: setsFor(key), future: cur > today });
        cur = addDays(cur, 1);
      }
      weeks.push(week);
    }

    const totalBatches = reviewedAt.length / CARDS_PER_BATCH;
    const bestBatches = Math.max(0, ...[...cards.values()].map((c) => c / CARDS_PER_BATCH));
    const goalDays = [...cards.values()].filter((c) => c / CARDS_PER_BATCH >= 4).length;

    // Current streak: consecutive active days ending today (or yesterday).
    let streak = 0;
    let cursor = today;
    if ((cards.get(ymd(today)) ?? 0) === 0 && (cards.get(ymd(addDays(today, -1))) ?? 0) > 0) {
      cursor = addDays(today, -1);
    }
    while ((cards.get(ymd(cursor)) ?? 0) > 0) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    return { weeks, totalBatches, streak, bestBatches, goalDays, hasData: true };
  }, [reviewedAt]);

  if (error) {
    return <p className="rounded-2xl bg-white p-6 font-bold text-tang shadow-pop">Error: {error}</p>;
  }
  if (!reviewedAt) {
    return <p className="text-lg font-bold text-ink/50">Loading…</p>;
  }

  if (!hasData) {
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-5xl">📊</div>
        <p className="mt-3 font-bold text-ink/60">No study history yet.</p>
        <p className="mt-1 text-sm font-semibold text-ink/50">
          Complete a study session and your daily activity will show up here.
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

  // Month labels: show the month at the first week where it appears.
  let lastMonth = -1;
  const monthLabels = weeks.map((w) => {
    const m = parseYmd(w[0].date).getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      return MONTHS[m];
    }
    return "";
  });

  return (
    <div className="animate-pop-in">
      <h1 className="font-display text-3xl font-700 text-ink" style={{ fontWeight: 700 }}>
        Practice calendar 📅
      </h1>
      <p className="mt-1 font-semibold text-ink/60">
        Each square is a day. It turns <span className="text-teal-dark">full green</span> when you
        hit your goal of <span className="text-teal-dark">4+ sets</span>. <span className="text-ink/40">1 set = 20 cards.</span>
      </p>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-pop-sm">
          <div className="font-display text-3xl font-700 text-teal-dark" style={{ fontWeight: 700 }}>
            {goalDays}
          </div>
          <div className="text-xs font-bold text-ink/50">goal days (4+)</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-pop-sm">
          <div className="font-display text-3xl font-700 text-tang" style={{ fontWeight: 700 }}>
            {streak}🔥
          </div>
          <div className="text-xs font-bold text-ink/50">day streak</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-pop-sm">
          <div className="font-display text-3xl font-700 text-grape" style={{ fontWeight: 700 }}>
            {bestBatches.toFixed(1)}
          </div>
          <div className="text-xs font-bold text-ink/50">best day (sets)</div>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-pop">
        <div className="overflow-x-auto pb-1">
          <div className="inline-block">
            {/* Month labels */}
            <div className="mb-1 flex gap-1">
              {monthLabels.map((m, i) => (
                <div key={i} className="w-4 text-[10px] font-bold text-ink/40">
                  {m}
                </div>
              ))}
            </div>
            {/* Week columns */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell) =>
                    cell.future ? (
                      <div key={cell.date} className="h-4 w-4" />
                    ) : (
                      <div
                        key={cell.date}
                        className={`h-4 w-4 rounded ${LEVEL_BG[levelFor(cell.sets)]}`}
                        title={`${cell.date} — ${cell.sets.toFixed(1)} set${cell.sets === 1 ? "" : "s"}`}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-ink/45">
          <span>Less</span>
          {LEVEL_BG.map((bg, i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded ${bg}`} />
          ))}
          <span>More</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-teal" /> = 4+ sets (goal)
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-ink/40">
        Days are counted in your local time. Only your first answer on each card counts — repeat
        drills don&apos;t inflate it. (Conjugation practice isn&apos;t tracked here yet — vocab sessions only.)
      </p>
    </div>
  );
}
