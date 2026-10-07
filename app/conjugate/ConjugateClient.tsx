"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { slotCorrect, type TenseId } from "@/lib/conjugation";
import type { ConjSessionVerb } from "@/app/api/conjugation/session/route";

export default function ConjugateClient({
  tense,
  tenseLabel,
}: {
  tense: TenseId;
  tenseLabel: string;
}) {
  const [verbs, setVerbs] = useState<ConjSessionVerb[] | null>(null);
  const [vIdx, setVIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [loadError, setLoadError] = useState("");

  // Per-verb state
  const [answers, setAnswers] = useState<string[]>([]);
  const [checked, setChecked] = useState<(boolean | null)[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [verbDone, setVerbDone] = useState(false);

  function load() {
    setVerbs(null);
    setLoadError("");
    setVIdx(0);
    setCorrect(0);
    return fetch(`/api/conjugation/session?tense=${tense}&size=8`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setVerbs(data.verbs as ConjSessionVerb[]);
      })
      .catch((err) => setLoadError(err.message || "Failed to load"));
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/conjugation/session?tense=${tense}&size=8`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.error) throw new Error(data.error);
        setVerbs(data.verbs as ConjSessionVerb[]);
      })
      .catch((err) => active && setLoadError(err.message || "Failed to load"));
    return () => {
      active = false;
    };
  }, []);

  const current = verbs?.[vIdx];

  // Reset per-verb state whenever the verb changes.
  useEffect(() => {
    if (!current) return;
    setAnswers(current.slots.map(() => ""));
    setChecked(current.slots.map(() => null));
    setActiveSlot(0);
    setVerbDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vIdx, verbs]);

  const finalize = useCallback(
    (finalChecked: boolean[]) => {
      if (!current) return;
      setVerbDone(true);
      const gotIt = finalChecked.every(Boolean);
      if (gotIt) setCorrect((c) => c + 1);
      fetch("/api/conjugation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_key: current.card_key, gotIt }),
      }).catch(() => {});
    },
    [current]
  );

  function setAnswer(i: number, val: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  }

  function checkStep() {
    if (!current) return;
    const slot = current.slots[activeSlot];
    const ok = slotCorrect(answers[activeSlot] ?? "", slot.answers);
    const newChecked = [...checked];
    newChecked[activeSlot] = ok;
    setChecked(newChecked);
    if (activeSlot < current.slots.length - 1) {
      setActiveSlot(activeSlot + 1);
    } else {
      finalize(newChecked as boolean[]);
    }
  }

  function checkAll() {
    if (!current) return;
    const newChecked = current.slots.map((s, i) => slotCorrect(answers[i] ?? "", s.answers));
    setChecked(newChecked);
    finalize(newChecked);
  }

  function nextVerb() {
    setVIdx((v) => v + 1);
  }

  if (loadError) {
    return <p className="rounded-2xl bg-white p-6 font-bold text-tang shadow-pop">Error: {loadError}</p>;
  }
  if (!verbs) return <p className="text-lg font-bold text-ink/50">Loading…</p>;

  const total = verbs.length;

  if (total === 0) {
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Nothing due!
        </h1>
        <p className="mt-2 font-semibold text-ink/60">
          No {tenseLabel} verbs are due right now — try another tense.
        </p>
        <Link
          href="/conjugate"
          className="mt-6 inline-block rounded-full bg-grape px-6 py-3 font-800 text-white shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          ← Back to tenses
        </Link>
      </div>
    );
  }

  if (vIdx >= total) {
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="animate-pop-in rounded-3xl bg-white p-10 text-center shadow-pop">
        <div className="text-6xl">{pct >= 80 ? "🏆" : pct >= 50 ? "🎉" : "💪"}</div>
        <h1 className="mt-3 font-display text-3xl font-700" style={{ fontWeight: 700 }}>
          Session complete!
        </h1>
        <p className="mt-2 text-lg font-bold text-ink/70">
          <span className="text-teal-dark">{correct}</span> / {total} verbs perfect{" "}
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

  const slots = current!.slots;
  const isTable = current!.mode === "table";
  const lastSlot = slots.length - 1;

  function slotVisible(i: number): boolean {
    if (isTable || verbDone) return true;
    return i <= activeSlot;
  }

  return (
    <div className="animate-pop-in">
      <div className="flex items-center justify-between text-sm font-bold text-ink/50">
        <Link href="/conjugate" className="transition hover:text-grape">
          ← {tenseLabel}
        </Link>
        <span className="flex items-center gap-2">
          <span
            className="rounded-full bg-grape/10 px-3 py-1 text-grape"
            title={
              isTable
                ? "You've nailed this verb — fill the whole table, then check."
                : "Guided mode — one field at a time. Get the verb perfect twice to graduate."
            }
          >
            {isTable ? "full table" : "guided"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 shadow-pop-sm">
            {vIdx + 1} / {total}
          </span>
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-grape to-teal transition-all duration-300"
          style={{ width: `${(vIdx / total) * 100}%` }}
        />
      </div>

      {/* Verb header */}
      <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-pop">
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
        <div className="mt-3 font-display text-4xl font-700 text-ink" style={{ fontWeight: 700 }}>
          {current!.verb}
        </div>

        {/* Slots */}
        <div className="mt-6 space-y-2 text-left">
          {slots.map((slot, i) => {
            if (!slotVisible(i)) return null;
            const result = checked[i];
            const isActiveInput = !isTable && !verbDone && i === activeSlot && result === null;
            const showInput = result === null && (isTable ? !verbDone : isActiveInput);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-right text-sm font-bold text-ink/50">
                  {slot.label}
                </div>
                {showInput ? (
                  <input
                    key={`${vIdx}-${i}`}
                    autoFocus={isActiveInput || (isTable && i === 0)}
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (isTable) {
                        if (i < lastSlot) {
                          const el = document.getElementById(`slot-${i + 1}`) as HTMLInputElement | null;
                          el?.focus();
                        } else {
                          checkAll();
                        }
                      } else {
                        checkStep();
                      }
                    }}
                    id={`slot-${i}`}
                    placeholder={slot.kind === "definition" ? "what does it mean?" : "conjugation…"}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="flex-1 rounded-xl border-2 border-ink/10 bg-white px-3 py-2 font-display text-xl font-700 text-ink outline-none focus:border-grape"
                    style={{ fontWeight: 700 }}
                  />
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <span
                      className={`font-display text-xl font-700 ${
                        result ? "text-teal-dark" : "text-tang line-through"
                      }`}
                      style={{ fontWeight: 700 }}
                    >
                      {answers[i] || "—"}
                    </span>
                    {result === false && (
                      <span className="font-display text-xl font-700 text-ink/70" style={{ fontWeight: 700 }}>
                        → {slot.answers[0]}
                      </span>
                    )}
                    {result === true && <span className="text-teal-dark">✓</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action */}
      {verbDone ? (
        <button
          onClick={nextVerb}
          className="mt-6 w-full rounded-2xl bg-tang py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          {checked.every(Boolean) ? "🎯 Perfect — next verb →" : "Next verb →"}
        </button>
      ) : isTable ? (
        <button
          onClick={checkAll}
          className="mt-6 w-full rounded-2xl bg-grape py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Check the whole table ✓
        </button>
      ) : (
        <button
          onClick={checkStep}
          className="mt-6 w-full rounded-2xl bg-grape py-5 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm"
          style={{ fontWeight: 800 }}
        >
          Check ✓ <span className="ml-1 text-xs text-white/70">(enter)</span>
        </button>
      )}

      <p className="mt-3 text-center text-xs font-semibold text-ink/40">
        Accents optional; the “to” in a definition is optional too (“have” works for “to have”).
      </p>
    </div>
  );
}
