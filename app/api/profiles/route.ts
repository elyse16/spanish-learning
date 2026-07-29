import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { setProfileCookies } from "@/lib/profile";

export const dynamic = "force-dynamic";

// GET /api/profiles — list all profiles.
export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profiles: data ?? [] });
}

// POST /api/profiles { name } — create a profile and make it active.
export async function POST(req: Request) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ name })
    .select("id, name")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Create failed" },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ profile: data });
  setProfileCookies(res, data.id, data.name);
  return res;
}
