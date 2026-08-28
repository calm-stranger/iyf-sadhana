import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SadhanaEntry } from "@/types/database";

export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/register");
  return profile as Profile;
}

/**
 * Pages that involve filling / viewing one's own sadhana card. The counsellor
 * (super_admin) does not submit a card, so they are sent to their portal.
 */
export async function requireSadhakaProfile(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role === "super_admin") redirect("/admin");
  return profile;
}

export async function getEntry(userId: string, date: string): Promise<SadhanaEntry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sadhana_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .maybeSingle();
  return (data as SadhanaEntry | null) ?? null;
}

export async function getEntries(
  userId: string,
  start: string,
  end: string,
): Promise<SadhanaEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sadhana_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("entry_date", start)
    .lte("entry_date", end)
    .order("entry_date");
  return (data as SadhanaEntry[]) ?? [];
}
