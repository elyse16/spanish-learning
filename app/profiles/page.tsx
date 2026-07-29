import { supabase } from "@/lib/supabase";
import ProfilePicker, { type Profile } from "./ProfilePicker";

export const dynamic = "force-dynamic";

async function getProfiles(): Promise<Profile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .order("name", { ascending: true });
  return data ?? [];
}

export default async function ProfilesPage() {
  const profiles = await getProfiles();
  return <ProfilePicker profiles={profiles} />;
}
