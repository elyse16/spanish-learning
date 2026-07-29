import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { setProfileCookies } from "@/lib/profile";

export const dynamic = "force-dynamic";

// POST /api/profiles/select { id } — make an existing profile active.
export async function POST(req: Request) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const res = NextResponse.json({ profile: data });
  setProfileCookies(res, data.id, data.name);
  return res;
}
