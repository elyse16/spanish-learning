"use client";

import { useState } from "react";
import Link from "next/link";
import { parseVocab, type ParsedRow } from "@/lib/parse";

type Status = "idle" | "saving" | "saved" | "error";

// Accent- and case-insensitive, whitespace-collapsed, so "a tiempo" matches an
// existing "Á tiempo" and "proximo ano" matches "Próximo año".
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");

export default function AddPage() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleParse() {
    setRows(parseVocab(raw));
    setStatus("idle");
    setMessage("");
    // Load the current library so we can flag repeats.
    try {
      const res = await fetch("/api/words");
      const data = await res.json();
      if (res.ok) {
        setExisting(new Set<string>((data.spanish ?? []).map((s: string) => norm(s))));
      }
    } catch {
      /* non-fatal — just skip duplicate flagging */
    }
  }

  function updateRow(i: number, field: keyof ParsedRow, value: string) {
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function removeRow(i: number) {
    setRows((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  // Per-row flags: complete, duplicate (already in library or earlier in this paste).
  const seen = new Set<string>();
  const flags = (rows ?? []).map((r) => {
    const key = norm(r.spanish);
    const complete = !!r.spanish.trim() && !!r.english.trim();
    const inLibrary = key !== "" && existing.has(key);
    const inBatch = key !== "" && seen.has(key);
    if (key) seen.add(key);
    return { complete, duplicate: inLibrary || inBatch, inLibrary, inBatch };
  });

  const readyRows =
    rows?.filter((r, i) => flags[i].complete && !flags[i].duplicate) ?? [];
  const incompleteCount = flags.filter((f) => !f.complete && !f.duplicate).length;
  const duplicateCount = flags.filter((f) => f.duplicate).length;
  const duplicateWords = (rows ?? [])
    .filter((_, i) => flags[i].duplicate)
    .map((r) => r.spanish.trim())
    .filter(Boolean);

  async function handleSave() {
    if (readyRows.length === 0) return;
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: readyRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus("saved");
      setMessage(`Saved ${data.inserted} word${data.inserted === 1 ? "" : "s"}! 🎉`);
      setRows(null);
      setRaw("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  }

  const bold800 = { fontWeight: 800 } as const;

  return (
    <div className="animate-pop-in">
      <h1 className="font-display text-3xl font-700 text-ink" style={{ fontWeight: 700 }}>
        Add words ✏️
      </h1>
      <p className="mt-1 font-semibold text-ink/60">
        Paste the list from your lesson. Each line splits into Spanish and English on
        the first “-”, “:”, or “=”. Words already in your library are flagged and
        skipped. Fix anything in the table before saving.
      </p>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={8}
        placeholder={"el gato = the cat\nel programador\ndelgado- thin /skinny"}
        className="mt-4 w-full rounded-2xl border-2 border-ink/10 bg-white p-4 font-mono text-sm shadow-pop-sm outline-none transition focus:border-tang"
      />

      <div className="mt-3">
        <button
          onClick={handleParse}
          disabled={!raw.trim()}
          className="rounded-full bg-grape px-6 py-3 font-800 text-white shadow-pop-sm transition active:translate-y-1 disabled:opacity-40"
          style={bold800}
        >
          ✨ Parse
        </button>
      </div>

      {rows && duplicateCount > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-tang/30 bg-tang/10 p-4">
          <p className="font-800 text-tang" style={bold800}>
            🔁 Already on your list — {duplicateCount} skipped
          </p>
          <p className="mt-1 text-sm font-semibold text-ink/70">
            These are already in your library (matched ignoring case &amp; accents), so they won&apos;t be
            added again:{" "}
            <span className="font-bold text-tang">{duplicateWords.join(", ")}</span>
          </p>
        </div>
      )}

      {rows && (
        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-600" style={{ fontWeight: 600 }}>
              Review <span className="text-teal-dark">({readyRows.length} new)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {duplicateCount > 0 && (
                <span className="rounded-full bg-tang/15 px-3 py-1 text-sm font-bold text-tang">
                  🔁 {duplicateCount} already in library (skipped)
                </span>
              )}
              {incompleteCount > 0 && (
                <span className="rounded-full bg-sunny/25 px-3 py-1 text-sm font-bold text-sunny-dark">
                  ⚠️ {incompleteCount} need a translation
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-pop">
            <table className="w-full text-sm">
              <thead className="text-left font-800 text-ink/50" style={bold800}>
                <tr className="border-b-2 border-ink/5">
                  <th className="px-3 py-2">Spanish</th>
                  <th className="px-3 py-2">English</th>
                  <th className="w-28 px-3 py-2">Status</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const f = flags[i];
                  const rowBg = f.duplicate
                    ? "bg-tang/5"
                    : !f.complete
                      ? "bg-sunny/10"
                      : "";
                  return (
                    <tr key={i} className={`border-b border-ink/5 last:border-0 ${rowBg}`}>
                      <td className="px-2 py-1">
                        <input
                          value={row.spanish}
                          onChange={(e) => updateRow(i, "spanish", e.target.value)}
                          className="w-full rounded-lg border-2 border-transparent bg-transparent px-2 py-1.5 font-bold text-ink outline-none focus:border-tang focus:bg-white"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={row.english}
                          onChange={(e) => updateRow(i, "english", e.target.value)}
                          placeholder="translation…"
                          className="w-full rounded-lg border-2 border-transparent bg-transparent px-2 py-1.5 text-ink outline-none placeholder:text-sunny-dark/60 focus:border-tang focus:bg-white"
                        />
                      </td>
                      <td className="px-2 py-1">
                        {f.duplicate ? (
                          <span
                            className="rounded-full bg-tang/15 px-2 py-0.5 text-xs font-800 text-tang"
                            style={bold800}
                            title={
                              f.inLibrary
                                ? "Already in your library"
                                : "Repeated in this paste"
                            }
                          >
                            🔁 {f.inLibrary ? "in library" : "repeat"}
                          </span>
                        ) : !f.complete ? (
                          <span className="text-xs font-bold text-sunny-dark">
                            needs translation
                          </span>
                        ) : (
                          <span className="text-xs font-800 text-teal-dark" style={bold800}>
                            ✓ new
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          onClick={() => removeRow(i)}
                          className="rounded-full px-2 py-1 text-ink/30 transition hover:bg-tang/10 hover:text-tang"
                          aria-label="Remove row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={readyRows.length === 0 || status === "saving"}
              className="rounded-full bg-tang px-6 py-3 font-800 text-white shadow-pop transition active:translate-y-1 active:shadow-pop-sm disabled:opacity-40"
              style={bold800}
            >
              {status === "saving"
                ? "Saving…"
                : `💾 Save ${readyRows.length} new word${readyRows.length === 1 ? "" : "s"}`}
            </button>
            {message && (
              <span
                className={`font-bold ${status === "error" ? "text-tang" : "text-teal-dark"}`}
              >
                {message}
              </span>
            )}
          </div>
        </div>
      )}

      {status === "saved" && (
        <p className="mt-4 font-semibold text-ink/70">
          {message}{" "}
          <Link href="/" className="font-800 text-tang underline" style={bold800}>
            Back to dashboard →
          </Link>
        </p>
      )}
    </div>
  );
}
