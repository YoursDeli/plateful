import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

// Verified against the Supabase Auth server (getUser), not just the cookie.
// Cached per request, so pages and layouts can both call it for free.
export const getCurrentUser = cache(async () => {
  // Fail closed (treated as signed out) until .env.local has Supabase keys.
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return profile;
});

export function isStaffRole(profile: Profile | null) {
  return profile?.role === "staff" || profile?.role === "admin";
}

// Server-side gate for the /(admin) route group and every admin server action.
// Server actions are public endpoints, so each one must call this itself.
export async function requireStaff(nextPath = "/admin") {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!isStaffRole(profile)) redirect("/");
  return profile;
}
