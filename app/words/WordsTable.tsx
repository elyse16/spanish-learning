"use client";

import { useState } from "react";
import type { Direction } from "@/lib/supabase";

export interface WordRow {
  id: string;
  spanish: string;
  english: string;
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

export default function WordsTable({ initialRows }: { initialRows: WordRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  async function handleDelete(row: WordRow) {
    if (
      !window.confirm(
        `Delete "${row.spanish}" (${row.english})?\nThis also removes its progress and review history.`
      )
    ) {
      return;
    }
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
                <th className="px-4 py-3">Spanish</th>
                <th className="px-4 py-3">English</th>
                <th className="px-4 py-3">ES→EN</th>
                <th className="px-4 py-3">EN→ES</th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 font-bold text-ink">{r.spanish}</td>
                  <td className="px-4 py-3 text-ink/60">{r.english}</td>
                  <td className="px-4 py-3">
                    <StatusBadge s={r.status.es_to_en} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge s={r.status.en_to_es} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deleting.has(r.id)}
                      className="rounded-full px-2 py-1 text-ink/30 transition hover:bg-tang/10 hover:text-tang disabled:opacity-40"
                      aria-label={`Delete ${r.spanish}`}
                      title="Delete word"
                    >
                      {deleting.has(r.id) ? "…" : "🗑️"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
