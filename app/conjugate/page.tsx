import { redirect } from "next/navigation";
import { getProfileId } from "@/lib/profile";
import ConjugateClient from "./ConjugateClient";

export const dynamic = "force-dynamic";

export default function ConjugatePage() {
  const profileId = getProfileId();
  if (!profileId) redirect("/profiles");
  return <ConjugateClient />;
}
