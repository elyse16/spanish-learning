"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Profile {
  id: string;
  name: string;
}

// Colorful avatar backgrounds cycled by index.
const AVATAR_COLORS = ["bg-tang", "bg-teal", "bg-grape", "bg-sunny"];

export default function ProfilePicker({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  async function select(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profiles/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="animate-pop-in mx-auto max-w-md text-center">
      <div className="text-5xl">🌶️</div>
      <h1 className="mt-3 font-display text-4xl font-700 text-ink" style={{ fontWeight: 700 }}>
        Who's studying?
      </h1>
      <p className="mt-1 font-semibold text-ink/60">Pick a profile to jump in.</p>

      {error && (
        <p className="mt-4 rounded-xl bg-tang/10 px-3 py-2 font-bold text-tang">{error}</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {profiles.map((p, i) => (
          <button
            key={p.id}
            onClick={() => select(p.id)}
            disabled={busy}
            className="group flex flex-col items-center gap-2 rounded-3xl bg-white p-5 shadow-pop transition active:translate-y-1 active:shadow-pop-sm disabled:opacity-50"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-display text-2xl font-700 text-white`}
              style={{ fontWeight: 700 }}
            >
              {p.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-bold text-ink">{p.name}</span>
          </button>
        ))}

        {creating ? (
          <div className="col-span-2 rounded-3xl bg-white p-5 shadow-pop sm:col-span-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Name…"
              className="w-full rounded-xl border-2 border-ink/10 px-3 py-2 text-center font-bold text-ink outline-none focus:border-tang"
            />
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={create}
                disabled={busy || !newName.trim()}
                className="rounded-full bg-tang px-5 py-2 font-800 text-white shadow-pop-sm disabled:opacity-40"
                style={{ fontWeight: 800 }}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="rounded-full bg-ink/5 px-5 py-2 font-800 text-ink/60"
                style={{ fontWeight: 800 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            disabled={busy}
            className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 p-5 text-ink/50 transition hover:border-tang hover:text-tang disabled:opacity-50"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/5 text-3xl">
              +
            </span>
            <span className="font-bold">New profile</span>
          </button>
        )}
      </div>
    </div>
  );
}
