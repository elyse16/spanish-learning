"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { isConjCorrect } from "@/lib/conjugation";
import type { ConjSessionCard } from "@/app/api/conjugation/session/route";

export default function ConjugateClient() {
  const [cards, setCards] = useState<ConjSessionCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"input" | "feedback">("input");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [loadError, setLoadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function load() {
    setCards(null);
    setLoadError("");
    setIdx(0);
    setCorrect(0);
    setInput("");
    setPhase("input");
    return fetch("/api/conjugation/session?size=20")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCards(data.cards as ConjSessionCard[]);
      })
      .catch((err) => setLoadError(err.message || "Failed to load"));
  }

  useEffect(() => {
    let active = true;
    fetch("/api/conjugation/session?size=20")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.error) throw new Error(data.error);
        setCards(data.cards as ConjSessionCard[]);
      })
      .catch((err) => active && setLoadError(err.message || "Failed to load"));
    return () => {
      active = false;
    };
  }, []);

  const current = cards?.[idx];

  // Focus the input at the start of each card.
  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [idx, phase, cards]);

  const submit = useCallback(() => {
    if (!current || !input.trim()) return;
    const ok = isConjCorrect(input, current.answer);
    setLastCorrect(ok);
    if (ok) setCorrect((c) => c + 1);
    fetch("/api/conjugation/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_key: current.card_key, gotIt: ok }),
    }).catch(() => {});
    setPhase("feedback");
  }, [current, input]);

  const next = useCallback(() => {
    setInput("");
    setPhase("input");
    setIdx((i) => i + 1);
  }, []);

  if (loadError) {
    return (
      <p className="rounded-2xl bg-white p-6 font-bold text-tang shadow-pop">
        Error: {loadError}
      </p>
    );
  }
  if (!cards) return <p className="text-lg font-bold text-ink/50">Loading…</p>;

  const total = cards.length;

  if (total === 0) {
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Nothing due!
        </h1>
        <p className="mt-2 font-semibold text-ink/60">
          No conjugations are due right now — come back later.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-grape px-6 py-3 font-800 text-white shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (idx >= total) {
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">{pct >= 80 ? "🏆" : pct >= 50 ? "🎉" : "💪"}</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Session complete!
        </h1>
        <p className="mt-2 text-lg font-bold text-ink/70">
          <span className="text-teal-dark">{correct}</span> / {total} correct{" "}
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
            onClick={() => load()}
            className="rounded-full bg-grape px-6 py-3 font-800 text-white shadow-pop-sm"
            style={{ fontWeight: 800 }}
          >
            Practice more →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pop-in">
      <div className="flex items-center justify-between text-sm font-bold text-ink/50">
        <span>🔀 Conjugations</span>
        <span className="rounded-full bg-white px-3 py-1 shadow-pop-sm">
          {idx + 1} / {total}
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-grape to-teal transition-all duration-300"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>

      {/* Prompt card */}
      <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-pop">
        <div className="flex items-center justify-center gap-2 text-xs font-800 uppercase tracking-widest" style={{ fontWeight: 800 }}>
          <span className="text-grape">{current!.tenseLabel}</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              current!.kind === "irregular" ? "bg-tang/15 text-tang" : "bg-teal/15 text-teal-dark"
            }`}
          >
            {current!.kind}
          </span>
        </div>
        <div className="mt-4 font-display text-4xl font-700 text-ink" style={{ fontWeight: 700 }}>
          {current!.verb}
        </div>
        <div className="mt-1 font-display text-lg font-600 text-ink/60" style={{ fontWeight: 600 }}>
          {current!.personLabel}
        </div>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (phase === "input") submit();
              else next();
            }
          }}
          readOnly={phase === "feedback"}
          placeholder="type the conjugation…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`mt-6 w-full rounded-2xl border-2 bg-white px-4 py-3 text-center font-display text-2xl font-700 outline-none transition ${
            phase === "feedback"
              ? lastCorrect
                ? "border-teal text-teal-dark"
                : "border-tang text-tang line-through"
              : "border-ink/10 text-ink focus:border-grape"
          }`}
          style={{ fontWeight: 700 }}
        />

        {phase === "feedback" && (
          <div className="mt-4">
            {lastCorrect ? (
              <p className="font-800 text-teal-dark" style={{ fontWeight: 800 }}>
                ✓ Correct!
              </p>
            ) : (
              <p className="font-bold text-ink/70">
                ✗ Answer:{" "}
                <span className="font-display text-xl font-700 text-tang" style={{ fontWeight: 700 }}>
                  {current!.answer}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {phase === "input" ? (
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="mt-6 w-full rounded-2xl bg-grape py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm disabled:opacity-40"
          style={{ fontWeight: 800 }}
        >
          Check ✓ <span className="ml-1 text-xs text-white/70">(enter)</span>
        </button>
      ) : (
        <button
          onClick={next}
          className="mt-6 w-full rounded-2xl bg-tang py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Next → <span className="ml-1 text-xs text-white/70">(enter)</span>
        </button>
      )}

      <p className="mt-3 text-center text-xs font-semibold text-ink/40">
        Accents optional — “hable” is accepted for “hablé”.
      </p>
    </div>
  );
}
