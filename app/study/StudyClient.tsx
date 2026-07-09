"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Direction } from "@/lib/supabase";
import type { SessionCard } from "@/app/api/session/route";

const DIRECTION_LABEL: Record<Direction, string> = {
  es_to_en: "Spanish → English",
  en_to_es: "English → Spanish",
};

export default function StudyClient({ direction }: { direction: Direction }) {
  const [cards, setCards] = useState<SessionCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/session?direction=${direction}&size=20`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.error) throw new Error(data.error);
        setCards(data.cards);
      })
      .catch((err) => active && setLoadError(err.message || "Failed to load"));
    return () => {
      active = false;
    };
  }, [direction]);

  const current = cards?.[idx];

  const grade = useCallback(
    async (gotIt: boolean) => {
      if (!current) return;
      if (gotIt) setCorrect((c) => c + 1);
      // Fire-and-forget the review update; advance immediately for snappiness.
      fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: current.card_id, gotIt }),
      }).catch(() => {});
      setFlipped(false);
      setIdx((i) => i + 1);
    },
    [current]
  );

  // Keyboard shortcuts: space/enter flips, 1 = missed, 2 = got it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) {
        grade(false);
      } else if (flipped && (e.key === "2" || e.key === "ArrowRight")) {
        grade(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, grade]);

  if (loadError) {
    return <p className="text-brand">Error: {loadError}</p>;
  }

  if (!cards) {
    return <p className="text-slate-500">Loading…</p>;
  }

  const total = cards.length;
  const done = idx >= total;

  if (total === 0) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Nothing due 🎉</h1>
        <p className="mt-2 text-slate-500">
          No {DIRECTION_LABEL[direction]} cards are due right now.
        </p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Session complete 🎉</h1>
        <p className="mt-2 text-slate-500">
          You got {correct} of {total} right.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Dashboard
          </Link>
          <button
            onClick={() => {
              setIdx(0);
              setCorrect(0);
              setFlipped(false);
              setCards(null);
              fetch(`/api/session?direction=${direction}&size=20`)
                .then((r) => r.json())
                .then((data) => setCards(data.cards ?? []));
            }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Study more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{DIRECTION_LABEL[direction]}</span>
        <span>
          {idx + 1} / {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="mt-6 flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md"
      >
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {flipped ? "Answer" : "Prompt — tap to flip"}
        </span>
        <span className="mt-3 text-3xl font-bold">
          {flipped ? current!.answer : current!.prompt}
        </span>
      </button>

      {flipped ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => grade(false)}
            className="rounded-xl bg-slate-200 py-4 text-lg font-semibold text-slate-800 hover:bg-slate-300"
          >
            Missed it
            <span className="ml-2 text-xs text-slate-500">(1)</span>
          </button>
          <button
            onClick={() => grade(true)}
            className="rounded-xl bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-700"
          >
            Got it
            <span className="ml-2 text-xs text-green-200">(2)</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="mt-6 w-full rounded-xl bg-brand py-4 text-lg font-semibold text-white hover:bg-brand-dark"
        >
          Flip card
          <span className="ml-2 text-xs text-rose-200">(space)</span>
        </button>
      )}
    </div>
  );
}
