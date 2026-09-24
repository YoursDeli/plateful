import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesGrid } from "@/components/favorites/favorites-grid";
import { getCategories } from "@/lib/menu";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your favourites", robots: { index: false } };

// Sign-in required (docs/site-sections-and-features.md §3). Reads with the
// user's session, so RLS returns only their own favourites.
export default async function FavoritesPage() {
  if (!isSupabaseConfigured()) redirect("/login?next=/favorites");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/favorites");

  const { data: favorites, error } = await supabase
    .from("favorites")
    .select("menu_item_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Couldn't load your favourites.");

  const ids = favorites.map((f) => f.menu_item_id);
  const [{ data: items, error: itemsError }, categories] = await Promise.all([
    ids.length > 0
      ? supabase.from("menu_items").select("*").in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    getCategories(),
  ]);
  if (itemsError) throw new Error("Couldn't load your favourites.");

  // Most recently saved first.
  const order = new Map(ids.map((id, i) => [id, i]));
  const sorted = [...(items ?? [])].sort((a, b) => order.get(a.id)! - order.get(b.id)!);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">Your favourites</h1>
        <p className="text-neutral-dark/65">Dishes you&apos;ve saved — add them to your cart in a tap.</p>
      </header>
      <FavoritesGrid items={sorted} categories={categories} />
    </main>
  );
}
