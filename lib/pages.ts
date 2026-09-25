import "server-only";
import { cache } from "react";
import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PageSlug, SitePage } from "@/lib/supabase/types";

// Admin-editable content pages (docs/pages-referrals-footer.md §2–3).
export const getPage = cache(async (slug: PageSlug): Promise<SitePage | null> => {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await createPublicClient()
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("page fetch failed:", slug, error.message);
    return null;
  }
  return data;
});

// Page copy uses "{brand}" so a rename never leaves stale text.
export function withBrand(text: string, brandName: string) {
  return text.replaceAll("{brand}", brandName).trim();
}
