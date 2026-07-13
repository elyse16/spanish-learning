"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Direction } from "@/lib/supabase";
import type { SessionCard } from "@/app/api/session/route";

const DIRECTION_LABEL: Record<Direction, string> = {
  es_to_en: "🇪🇸 Spanish → English 🇬🇧",
  en_to_es: "🇬🇧 English → Spanish 🇪🇸",
};

export default function StudyClient({ direction }: { direction: Direction }) {
  const [cards, setCards] = useState<SessionCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [loadError, setLoadError] = useState("");

  function loadSession() {
    setCards(null);
    return fetch(`/api/session?direction=${direction}&size=20`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCards(data.cards);
      })
      .catch((err) => setLoadError(err.message || "Failed to load"));
  }

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
    return (
      <p className="rounded-2xl bg-white p-6 font-bold text-tang shadow-pop">
        Error: {loadError}
      </p>
    );
  }

  if (!cards) {
    return <p className="text-lg font-bold text-ink/50">Loading…</p>;
  }

  const total = cards.length;
  const done = idx >= total;

  if (total === 0) {
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Nothing due!
        </h1>
        <p className="mt-2 font-semibold text-ink/60">
          No {DIRECTION_LABEL[direction]} cards are due right now.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-tang px-6 py-3 font-800 text-white shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">{pct >= 80 ? "🏆" : pct >= 50 ? "🎉" : "💪"}</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Session complete!
        </h1>
        <p className="mt-2 text-lg font-bold text-ink/70">
          You got <span className="text-teal-dark">{correct}</span> of {total} right
          <span className="text-ink/40"> ({pct}%)</span>
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-white px-5 py-3 font-800 text-ink shadow-pop-sm ring-2 ring-ink/10"
            style={{ fontWeight: 800 }}
          >
            Dashboard
          </Link>
          <button
            onClick={() => {
              setIdx(0);
              setCorrect(0);
              setFlipped(false);
              loadSession();
            }}
            className="rounded-full bg-tang px-6 py-3 font-800 text-white shadow-pop-sm"
            style={{ fontWeight: 800 }}
          >
            Study more →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pop-in">
      <div className="flex items-center justify-between text-sm font-bold text-ink/50">
        <span>{DIRECTION_LABEL[direction]}</span>
        <span className="rounded-full bg-white px-3 py-1 shadow-pop-sm">
          {idx + 1} / {total}
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sunny to-tang transition-all duration-300"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>

      {/* Flip card */}
      <div className="flip-card mt-6">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="relative block h-64 w-full text-left"
          aria-label="Flip card"
        >
          <div
            key={current!.card_id}
            className={`flip-inner relative h-full w-full ${flipped ? "is-flipped" : ""}`}
          >
            {/* Front (prompt) */}
            <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-pop">
              <span className="text-xs font-800 uppercase tracking-widest text-tang" style={{ fontWeight: 800 }}>
                Prompt
              </span>
              <span className="mt-4 font-display text-4xl font-700 text-ink" style={{ fontWeight: 700 }}>
                {current!.prompt}
              </span>
              <span className="mt-6 text-xs font-bold text-ink/40">tap to flip</span>
            </div>
            {/* Back (answer) */}
            <div className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-grape p-8 text-center text-white shadow-pop">
              <span className="text-xs font-800 uppercase tracking-widest text-white/70" style={{ fontWeight: 800 }}>
                Answer
              </span>
              <span className="mt-4 font-display text-4xl font-700" style={{ fontWeight: 700 }}>
                {current!.answer}
              </span>
              <span className="mt-2 text-sm font-semibold text-white/70">{current!.prompt}</span>
            </div>
          </div>
        </button>
      </div>

      {flipped ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => grade(false)}
            className="rounded-2xl bg-white py-5 font-800 text-ink shadow-pop-sm ring-2 ring-ink/10 transition active:translate-y-1"
            style={{ fontWeight: 800 }}
          >
            😕 Missed it
            <span className="ml-1 text-xs text-ink/40">(1)</span>
          </button>
          <button
            onClick={() => grade(true)}
            className="rounded-2xl bg-teal py-5 font-800 text-white shadow-pop-sm transition active:translate-y-1"
            style={{ fontWeight: 800 }}
          >
            🎯 Got it
            <span className="ml-1 text-xs text-white/70">(2)</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="mt-6 w-full rounded-2xl bg-tang py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Flip card 🔄
          <span className="ml-2 text-xs text-white/70">(space)</span>
        </button>
      )}
    </div>
  );
}
