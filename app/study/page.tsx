import { Suspense } from "react";
import type { Direction } from "@/lib/supabase";
import StudyClient from "./StudyClient";

export const dynamic = "force-dynamic";

export default function StudyPage({
  searchParams,
}: {
  searchParams: { direction?: string };
}) {
  const direction: Direction =
    searchParams.direction === "en_to_es" ? "en_to_es" : "es_to_en";

  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <StudyClient direction={direction} />
    </Suspense>
  );
}
