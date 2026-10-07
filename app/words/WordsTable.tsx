"use client";

import { useState } from "react";
import type { Direction } from "@/lib/supabase";

export interface WordRow {
  id: string;
  spanish: string;
  english: string;
  editable: boolean; // true only for words this profile added
  status: Record<Direction, { mastered: boolean; interval_days: number } | undefined>;
}

function StatusBadge({
  s,
}: {
  s: { mastered: boolean; interval_days: number } | undefined;
}) {
  if (!s) return <span className="text-ink/20">—</span>;
  if (s.mastered)
    return (
      <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-xs font-800 text-teal-dark" style={{ fontWeight: 800 }}>
        ✓ mastered
      </span>
    );
  if (s.interval_days === 0)
    return (
      <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-800 text-ink/50" style={{ fontWeight: 800 }}>
        ✦ new
      </span>
    );
  return (
    <span className="rounded-full bg-sunny/25 px-2.5 py-0.5 text-xs font-800 text-sunny-dark" style={{ fontWeight: 800 }}>
      {s.interval_days}d
    </span>
  );
}

const editInputCls =
  "w-full rounded-lg border-2 border-tang/40 bg-white px-2 py-1.5 outline-none focus:border-tang";

type SortCol = "spanish" | "english" | "es_to_en" | "en_to_es";

function statusRank(s: { mastered: boolean; interval_days: number } | undefined): number {
  if (!s) return -1; // no card yet
  if (s.mastered) return 1_000_000;
  return s.interval_days; // 0 = new, larger = further along
}

export default function WordsTable({ initialRows }: { initialRows: WordRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSpanish, setEditSpanish] = useState("");
  const [editEnglish, setEditEnglish] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" } | null>(null);

  function toggleSort(col: SortCol) {
    setSort((prev) =>
      prev && prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  }

  const sortedRows = (() => {
    if (!sort) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sort.col === "spanish") cmp = a.spanish.localeCompare(b.spanish, "es", { sensitivity: "base" });
      else if (sort.col === "english") cmp = a.english.localeCompare(b.english, "en", { sensitivity: "base" });
      else cmp = statusRank(a.status[sort.col]) - statusRank(b.status[sort.col]);
      return cmp * factor;
    });
    return copy;
  })();

  function arrow(col: SortCol) {
    if (!sort || sort.col !== col) return "↕";
    return sort.dir === "asc" ? "↑" : "↓";
  }

  function startEdit(row: WordRow) {
    setConfirmingId(null);
    setError("");
    setEditingId(row.id);
    setEditSpanish(row.spanish);
    setEditEnglish(row.english);
  }

  async function saveEdit(row: WordRow) {
    const spanish = editSpanish.trim();
    const english = editEnglish.trim();
    if (!spanish || !english) {
      setError("Both Spanish and English are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/words/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spanish, english }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, spanish, english } : r))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete(row: WordRow) {
    setConfirmingId(null);
    setError("");
    setDeleting((prev) => new Set(prev).add(row.id));
    try {
      const res = await fetch(`/api/words/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }

  return (
    <>
      <p className="mt-1 font-semibold text-ink/50">{rows.length} total</p>

      {error && (
        <p className="mt-2 rounded-xl bg-tang/10 px-3 py-2 font-bold text-tang">{error}</p>
      )}

      {rows.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-pop">
          <div className="text-5xl">📭</div>
          <p className="mt-3 font-bold text-ink/60">No words yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-pop">
          <table className="w-full text-sm">
            <thead className="text-left font-800 text-ink/50" style={{ fontWeight: 800 }}>
              <tr className="border-b-2 border-ink/5">
                {(
                  [
                    ["spanish", "Spanish"],
                    ["english", "English"],
                    ["es_to_en", "ES→EN"],
                    ["en_to_es", "EN→ES"],
                  ] as [SortCol, string][]
                ).map(([col, label]) => (
                  <th key={col} className="px-4 py-3">
                    <button
                      onClick={() => toggleSort(col)}
                      className="flex items-center gap-1 font-800 text-ink/50 transition hover:text-ink"
                      style={{ fontWeight: 800 }}
                    >
                      {label}
                      <span className={sort?.col === col ? "text-tang" : "text-ink/25"}>
                        {arrow(col)}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="w-28 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const isEditing = editingId === r.id;
                const isConfirming = confirmingId === r.id;
                const isDeleting = deleting.has(r.id);
                return (
                  <tr key={r.id} className="border-b border-ink/5 last:border-0">
                    {isEditing ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            value={editSpanish}
                            onChange={(e) => setEditSpanish(e.target.value)}
                            className={`${editInputCls} font-bold text-ink`}
                            aria-label="Edit Spanish"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editEnglish}
                            onChange={(e) => setEditEnglish(e.target.value)}
                            className={`${editInputCls} text-ink`}
                            aria-label="Edit English"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge s={r.status.es_to_en} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge s={r.status.en_to_es} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(r)}
                              disabled={saving}
                              className="rounded-full bg-teal px-3 py-1 text-xs font-800 text-white disabled:opacity-50"
                              style={{ fontWeight: 800 }}
                            >
                              {saving ? "…" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-full bg-ink/5 px-3 py-1 text-xs font-800 text-ink/60"
                              style={{ fontWeight: 800 }}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-bold text-ink">{r.spanish}</td>
                        <td className="px-4 py-3 text-ink/60">{r.english}</td>
                        <td className="px-4 py-3">
                          <StatusBadge s={r.status.es_to_en} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge s={r.status.en_to_es} />
                        </td>
                        <td className="px-3 py-3">
                          {isConfirming ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="mr-1 text-xs font-bold text-ink/50">Delete?</span>
                              <button
                                onClick={() => performDelete(r)}
                                className="rounded-full bg-tang px-2.5 py-1 text-xs font-800 text-white"
                                style={{ fontWeight: 800 }}
                                aria-label={`Confirm delete ${r.spanish}`}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-800 text-ink/60"
                                style={{ fontWeight: 800 }}
                                aria-label="Cancel delete"
                              >
                                No
                              </button>
                            </div>
                          ) : r.editable ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(r)}
                                className="rounded-full px-2 py-1 text-ink/30 transition hover:bg-grape/10 hover:text-grape"
                                aria-label={`Edit ${r.spanish}`}
                                title="Edit word"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setConfirmingId(r.id)}
                                disabled={isDeleting}
                                className="rounded-full px-2 py-1 text-ink/30 transition hover:bg-tang/10 hover:text-tang disabled:opacity-40"
                                aria-label={`Delete ${r.spanish}`}
                                title="Delete word"
                              >
                                {isDeleting ? "…" : "🗑️"}
                              </button>
                            </div>
                          ) : (
                            <div
                              className="text-right text-ink/20"
                              title="Added by another profile — shared for study"
                            >
                              🔒
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
