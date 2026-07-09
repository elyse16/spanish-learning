"use client";

import { useState } from "react";
import Link from "next/link";
import { parseVocab, type ParsedRow } from "@/lib/parse";

type Status = "idle" | "saving" | "saved" | "error";

export default function AddPage() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function handleParse() {
    setRows(parseVocab(raw));
    setStatus("idle");
    setMessage("");
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

  const readyRows = rows?.filter((r) => r.spanish.trim() && r.english.trim()) ?? [];
  const incompleteCount = (rows?.length ?? 0) - readyRows.length;

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
      setMessage(`Saved ${data.inserted} word${data.inserted === 1 ? "" : "s"}.`);
      setRows(null);
      setRaw("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Add words</h1>
      <p className="mt-1 text-slate-500">
        Paste the list from your lesson. Each line is split into Spanish and English on
        the first “-” or “:”. Review and fix the table below before saving.
      </p>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={8}
        placeholder={"el gato- the cat\nel programador\ndelgado- thin /skinny"}
        className="mt-4 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      <div className="mt-3">
        <button
          onClick={handleParse}
          disabled={!raw.trim()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Parse
        </button>
      </div>

      {rows && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Review ({readyRows.length} ready)</h2>
            {incompleteCount > 0 && (
              <span className="text-sm text-amber-600">
                {incompleteCount} row{incompleteCount === 1 ? "" : "s"} missing a
                translation — fill in or remove.
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Spanish</th>
                  <th className="px-3 py-2">English</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const incomplete = !row.spanish.trim() || !row.english.trim();
                  return (
                    <tr
                      key={i}
                      className={incomplete ? "bg-amber-50" : "bg-white"}
                    >
                      <td className="px-2 py-1">
                        <input
                          value={row.spanish}
                          onChange={(e) => updateRow(i, "spanish", e.target.value)}
                          className="w-full rounded border border-transparent bg-transparent px-2 py-1 focus:border-slate-300 focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={row.english}
                          onChange={(e) => updateRow(i, "english", e.target.value)}
                          placeholder="translation…"
                          className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-amber-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-slate-400 hover:text-brand"
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

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={readyRows.length === 0 || status === "saving"}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {status === "saving" ? "Saving…" : `Save ${readyRows.length} words`}
            </button>
            {message && (
              <span
                className={
                  status === "error" ? "text-sm text-brand" : "text-sm text-green-600"
                }
              >
                {message}
              </span>
            )}
          </div>
        </div>
      )}

      {status === "saved" && (
        <p className="mt-4 text-sm text-slate-600">
          {message}{" "}
          <Link href="/" className="font-semibold text-brand underline">
            Back to dashboard
          </Link>
        </p>
      )}
    </div>
  );
}
