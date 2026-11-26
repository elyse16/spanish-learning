import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";

export const dynamic = "force-dynamic";

const PAGE = 1000;

// TEMP read-only endpoint: dump every word pair for a translation/spelling
// review. Remove after use.
export async function GET() {
  const profileId = getProfileId();
  if (!profileId) return NextResponse.json({ error: "No profile selected" }, { status: 401 });

  const out: { id: string; spanish: string; english: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("words")
      .select("id, spanish, english")
      .order("spanish", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }

  return NextResponse.json({ count: out.length, words: out });
}
