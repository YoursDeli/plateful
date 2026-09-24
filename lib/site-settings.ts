import "server-only";
import { cache } from "react";
import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/supabase/types";

// Mirrors the column defaults in supabase/migrations — used only when the DB
// isn't reachable (e.g. first build before .env.local is filled in).
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  brand_name: "Plateful",
  logo_url: null,
  primary_color: "#D3C5F6",
  accent_color: "#3B2A60",
  updated_at: new Date(0).toISOString(),
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!isSupabaseConfigured()) return DEFAULT_SITE_SETTINGS;

  const { data, error } = await createPublicClient()
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("site_settings fetch failed:", error.message);
    return DEFAULT_SITE_SETTINGS;
  }
  return data;
});

// CSS custom properties the Tailwind theme tokens resolve to (app/globals.css).
// Colors are re-validated here because they're injected into a <style> tag.
export function themeCssVars(settings: SiteSettings) {
  const primary = HEX.test(settings.primary_color)
    ? settings.primary_color
    : DEFAULT_SITE_SETTINGS.primary_color;
  const secondary = HEX.test(settings.accent_color)
    ? settings.accent_color
    : DEFAULT_SITE_SETTINGS.accent_color;
  return `:root{--brand-primary:${primary};--brand-secondary:${secondary};}`;
}
