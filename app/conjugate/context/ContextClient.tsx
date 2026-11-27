"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { slotCorrect } from "@/lib/conjugation";
import { buildCueSession, type CuePrompt } from "@/lib/cues";

const SESSION_SIZE = 10;

export default function ContextClient() {
  const [prompts, setPrompts] = useState<CuePrompt[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);

  // Generate client-side only (uses Math.random) to avoid hydration mismatch.
  function start() {
    setPrompts(buildCueSession(SESSION_SIZE));
    setIdx(0);
    setInput("");
    setResult(null);
    setCorrect(0);
  }
  useEffect(() => {
    start();
  }, []);

  if (!prompts) return <p className="text-lg font-bold text-ink/50">Loading…</p>;

  // Summary
  if (idx >= prompts.length) {
    const pct = Math.round((correct / prompts.length) * 100);
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">{pct >= 80 ? "🏆" : pct >= 50 ? "🎉" : "💪"}</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Done!
        </h1>
        <p className="mt-2 text-lg font-bold text-ink/70">
          <span className="text-teal-dark">{correct}</span> / {prompts.length} right{" "}
          <span className="text-ink/40">({pct}%)</span>
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/conjugate"
            className="rounded-full bg-white px-5 py-3 font-800 text-ink shadow-pop-sm ring-2 ring-ink/10"
            style={{ fontWeight: 800 }}
          >
            ← Conjugations
          </Link>
          <button
            onClick={start}
            className="rounded-full bg-grape px-6 py-3 font-800 text-white shadow-pop-sm"
            style={{ fontWeight: 800 }}
          >
            New set →
          </button>
        </div>
      </div>
    );
  }

  const p = prompts[idx];
  const [before, after] = p.sentence.split("___");

  function check() {
    if (result !== null) return;
    const ok = slotCorrect(input, [p.answer]);
    setResult(ok);
    if (ok) setCorrect((c) => c + 1);
  }
  function next() {
    setIdx((i) => i + 1);
    setInput("");
    setResult(null);
  }

  return (
    <div className="animate-pop-in">
      <div className="flex items-center justify-between text-sm font-bold text-ink/50">
        <Link href="/conjugate" className="transition hover:text-grape">
          ← Conjugations
        </Link>
        <span className="rounded-full bg-white px-3 py-1 shadow-pop-sm">
          {idx + 1} / {prompts.length}
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-grape to-teal transition-all duration-300"
          style={{ width: `${(idx / prompts.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 rounded-3xl bg-white p-6 shadow-pop">
        <div className="text-xs font-800 uppercase tracking-widest text-grape" style={{ fontWeight: 800 }}>
          Which tense fits?
        </div>

        {/* Cue sentence with an inline blank */}
        <p className="mt-3 font-display text-2xl font-600 leading-snug text-ink" style={{ fontWeight: 600 }}>
          {before}
          <span className="mx-1 rounded-lg bg-sunny/30 px-2 py-0.5 text-grape-dark">
            {result === null ? "____" : p.answer}
          </span>
          {after}
        </p>
        <p className="mt-2 text-sm font-semibold text-ink/50">
          Give the Spanish form for <span className="text-ink/70">“{p.subject}”</span>.
        </p>

        {/* Input / feedback */}
        {result === null ? (
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                check();
              }
            }}
            placeholder="type the conjugated verb…"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-5 w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-3 font-display text-xl font-700 text-ink outline-none focus:border-grape"
            style={{ fontWeight: 700 }}
          />
        ) : (
          <div className="mt-5 rounded-2xl p-4" style={{ background: result ? "rgba(20,184,166,0.08)" : "rgba(255,107,53,0.08)" }}>
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-xl font-700 ${result ? "text-teal-dark" : "text-tang line-through"}`} style={{ fontWeight: 700 }}>
                {input || "—"}
              </span>
              {!result && (
                <span className="font-display text-xl font-700 text-ink" style={{ fontWeight: 700 }}>
                  → {p.answer}
                </span>
              )}
              {result && <span className="text-teal-dark">✓</span>}
            </div>
            <div className="mt-2 text-sm font-semibold text-ink/60">
              <span className="font-800 text-grape" style={{ fontWeight: 800 }}>{p.tenseLabel}</span> — {p.why}
            </div>
          </div>
        )}
      </div>

      {result === null ? (
        <button
          onClick={check}
          className="mt-6 w-full rounded-2xl bg-grape py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Check ✓ <span className="ml-1 text-xs text-white/70">(enter)</span>
        </button>
      ) : (
        <button
          autoFocus
          onClick={next}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              next();
            }
          }}
          className="mt-6 w-full rounded-2xl bg-tang py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Next →
        </button>
      )}

      <p className="mt-3 text-center text-xs font-semibold text-ink/40">
        The tense isn’t given — read the context and pick it yourself. Accents optional.
      </p>
    </div>
  );
}
