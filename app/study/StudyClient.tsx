"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Direction } from "@/lib/supabase";
import type { SessionCard } from "@/app/api/session/route";

const DIRECTION_LABEL: Record<Direction, string> = {
  es_to_en: "🇪🇸 Spanish → English 🇬🇧",
  en_to_es: "🇬🇧 English → Spanish 🇪🇸",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudyClient({ direction }: { direction: Direction }) {
  const [queue, setQueue] = useState<SessionCard[] | null>(null); // current round
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [initialCount, setInitialCount] = useState(0);
  const [missed, setMissed] = useState<SessionCard[]>([]); // missed this round
  const [graded, setGraded] = useState<Set<string>>(new Set()); // first-attempt SRS done
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [pendingQueue, setPendingQueue] = useState<SessionCard[] | null>(null);
  const [betweenRounds, setBetweenRounds] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loadError, setLoadError] = useState("");

  function resetAll(cards: SessionCard[]) {
    setQueue(cards);
    setIdx(0);
    setRound(1);
    setInitialCount(cards.length);
    setMissed([]);
    setGraded(new Set());
    setFirstTryCorrect(0);
    setPendingQueue(null);
    setBetweenRounds(null);
    setFlipped(false);
  }

  function loadSession() {
    setQueue(null);
    setLoadError("");
    return fetch(`/api/session?direction=${direction}&size=20`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        resetAll(data.cards as SessionCard[]);
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
        resetAll(data.cards as SessionCard[]);
      })
      .catch((err) => active && setLoadError(err.message || "Failed to load"));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  const current = queue?.[idx];

  const grade = useCallback(
    (gotIt: boolean) => {
      if (!queue || !current) return;

      // Only the FIRST attempt on a card drives the spaced-repetition schedule.
      if (!graded.has(current.card_id)) {
        fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_id: current.card_id, gotIt }),
        }).catch(() => {});
        setGraded((prev) => new Set(prev).add(current.card_id));
        if (gotIt) setFirstTryCorrect((c) => c + 1);
      }

      const newMissed = gotIt ? missed : [...missed, current];
      const nextIdx = idx + 1;
      setFlipped(false);

      if (nextIdx < queue.length) {
        setMissed(newMissed);
        setIdx(nextIdx);
      } else if (newMissed.length > 0) {
        // Round finished with cards still to clear — show the interstitial.
        setPendingQueue(shuffle(newMissed));
        setBetweenRounds(newMissed.length);
        setMissed([]);
      } else {
        // Everything cleared.
        setMissed([]);
        setIdx(nextIdx); // idx >= queue.length && no pending round => done
      }
    },
    [queue, current, idx, missed, graded]
  );

  function startNextRound() {
    if (!pendingQueue) return;
    setQueue(pendingQueue);
    setIdx(0);
    setRound((r) => r + 1);
    setPendingQueue(null);
    setBetweenRounds(null);
    setFlipped(false);
  }

  // Keyboard: space/enter flips; 1 = missed, 2 = got it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (betweenRounds !== null) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startNextRound();
        }
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, flipped, grade, betweenRounds, pendingQueue]);

  if (loadError) {
    return (
      <p className="rounded-2xl bg-white p-6 font-bold text-tang shadow-pop">
        Error: {loadError}
      </p>
    );
  }

  if (!queue) {
    return <p className="text-lg font-bold text-ink/50">Loading…</p>;
  }

  if (initialCount === 0) {
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

  // Between-rounds interstitial.
  if (betweenRounds !== null) {
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">🔁</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Round {round} done!
        </h1>
        <p className="mt-2 text-lg font-bold text-ink/70">
          <span className="text-tang">{betweenRounds}</span> to review — let's nail them.
        </p>
        <button
          onClick={startNextRound}
          className="mt-6 rounded-full bg-tang px-6 py-3 font-800 text-white shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Review {betweenRounds} again →
          <span className="ml-2 text-xs text-white/70">(space)</span>
        </button>
      </div>
    );
  }

  const done = idx >= queue.length;

  if (done) {
    const pct = initialCount > 0 ? Math.round((firstTryCorrect / initialCount) * 100) : 0;
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">{pct >= 80 ? "🏆" : pct >= 50 ? "🎉" : "💪"}</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          All {initialCount} cleared!
        </h1>
        <p className="mt-2 text-lg font-bold text-ink/70">
          Took {round} round{round === 1 ? "" : "s"} · first-try{" "}
          <span className="text-teal-dark">
            {firstTryCorrect}/{initialCount}
          </span>{" "}
          <span className="text-ink/40">({pct}%)</span>
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
            onClick={() => loadSession()}
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
        <span className="flex items-center gap-2">
          {round > 1 && (
            <span className="rounded-full bg-tang/10 px-3 py-1 text-tang">Round {round}</span>
          )}
          <span className="rounded-full bg-white px-3 py-1 shadow-pop-sm">
            {idx + 1} / {queue.length}
          </span>
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sunny to-tang transition-all duration-300"
          style={{ width: `${(idx / queue.length) * 100}%` }}
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
