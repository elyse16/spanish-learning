import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProfileId } from "@/lib/profile";

export const dynamic = "force-dynamic";

// DELETE /api/words/:id — remove a word (cascades to its cards + review history).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("words")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// PATCH /api/words/:id — edit a word's Spanish/English. Progress is preserved.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const profileId = getProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "No profile selected" }, { status: 401 });
  }
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let body: { spanish?: string; english?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const spanish = (body.spanish ?? "").trim();
  const english = (body.english ?? "").trim();
  if (!spanish || !english) {
    return NextResponse.json(
      { error: "Both Spanish and English are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("words")
    .update({ spanish, english })
    .eq("id", id)
    .eq("profile_id", profileId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, spanish, english });
}
