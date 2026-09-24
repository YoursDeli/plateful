import "server-only";
import { cache } from "react";
import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Category, MenuItem, PublicReview } from "@/lib/supabase/types";

// Public storefront reads. Cookie-less anon client so pages stay statically
// cached; admin edits call revalidatePath("/", "layout") to refresh them.

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Couldn't load categories: ${error.message}`);
  return data;
});

export const getMenuItems = cache(async (): Promise<MenuItem[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from("menu_items")
    .select("*")
    .order("name");
  if (error) throw new Error(`Couldn't load the menu: ${error.message}`);
  return data;
});

export const getMenuItem = cache(async (id: string): Promise<MenuItem | null> => {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await createPublicClient()
    .from("menu_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load this dish: ${error.message}`);
  return data;
});

// Hero dishes: admin-curated via featured_order, available only.
export async function getFeaturedItems() {
  const items = await getMenuItems();
  return items
    .filter((i) => typeof i.featured_order === "number" && i.is_available)
    .sort((a, b) => a.featured_order! - b.featured_order!);
}

// "Popular" row on home: admin-badged Bestsellers, else the first few
// available dishes so the section is never empty on a fresh menu.
export async function getPopularItems(limit = 8) {
  const items = (await getMenuItems()).filter((i) => i.is_available);
  const bestsellers = items.filter((i) => i.badge === "Bestseller");
  return (bestsellers.length > 0 ? bestsellers : items).slice(0, limit);
}

export async function getReviews(menuItemId: string): Promise<PublicReview[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient().rpc("menu_item_reviews", {
    p_menu_item_id: menuItemId,
    p_limit: 20,
  });
  if (error) {
    console.error("menu_item_reviews failed:", error.message);
    return [];
  }
  return data;
}
