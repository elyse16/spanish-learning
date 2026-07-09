import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// TEMPORARY debug endpoint — shows which database the running deployment is
// actually connected to, plus a live count and a small sample. Remove after
// diagnosing. Exposes only the public project host and the user's own words.
export async function GET() {
  const url = process.env.SUPABASE_URL ?? "(unset)";
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* leave as-is */
  }

  const { count } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true });

  const { data: sample } = await supabase
    .from("words")
    .select("spanish, english, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    supabase_host: host,
    words_count: count ?? 0,
    sample: sample ?? [],
    deployed_at: new Date().toISOString(),
  });
}
