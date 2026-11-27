import { redirect } from "next/navigation";
import { getProfileId } from "@/lib/profile";
import ContextClient from "./ContextClient";

export const dynamic = "force-dynamic";

export default function ContextPage() {
  const profileId = getProfileId();
  if (!profileId) redirect("/profiles");
  return <ContextClient />;
}
