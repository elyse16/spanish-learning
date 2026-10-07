import { redirect, notFound } from "next/navigation";
import { getProfileId } from "@/lib/profile";
import { TENSES, type TenseId } from "@/lib/conjugation";
import ConjugateClient from "../ConjugateClient";

export const dynamic = "force-dynamic";

export default function ConjugateTensePage({ params }: { params: { tense: string } }) {
  const profileId = getProfileId();
  if (!profileId) redirect("/profiles");

  const t = TENSES.find((x) => x.id === params.tense);
  if (!t) notFound();

  return <ConjugateClient tense={t.id as TenseId} tenseLabel={t.label} />;
}
