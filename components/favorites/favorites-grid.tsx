"use client";

import Link from "next/link";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { useFavorites } from "@/lib/favorites/store";
import type { Category, MenuItem } from "@/lib/supabase/types";

// /favorites: server passes the user's saved dishes; once the store has
// loaded, un-hearting a dish removes its card immediately.
export function FavoritesGrid({ items, categories }: { items: MenuItem[]; categories: Category[] }) {
  const ids = useFavorites((s) => s.ids);
  const ready = useFavorites((s) => s.status === "ready");
  const visible = ready ? items.filter((i) => ids.has(i.id)) : items;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-secondary/20 px-6 py-14 text-center">
        <p className="font-display text-2xl text-secondary">No favourites yet</p>
        <p className="max-w-sm text-sm text-neutral-dark/60">
          Tap the heart on any dish to save it here for quick reordering.
        </p>
        <Link href="/menu" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-secondary">
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {visible.map((item) => (
        <li key={item.id}>
          <MenuItemCard
            item={item}
            categoryName={item.category_id ? categoryName.get(item.category_id) : null}
          />
        </li>
      ))}
    </ul>
  );
}

// Home page row (docs/site-sections-and-features.md §1.4): only for signed-in
// visitors with favourites. Filled client-side so the home page stays cached.
export function HomeFavoritesRow({ items, categories }: { items: MenuItem[]; categories: Category[] }) {
  const ids = useFavorites((s) => s.ids);
  const ready = useFavorites((s) => s.status === "ready");
  if (!ready || ids.size === 0) return null;

  const favorites = items.filter((i) => ids.has(i.id)).slice(0, 8);
  if (favorites.length === 0) return null;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <section aria-labelledby="home-favorites" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 id="home-favorites" className="font-display text-2xl font-semibold text-secondary">
          Your favourites
        </h2>
        <Link href="/favorites" className="text-sm font-medium text-secondary underline-offset-4 hover:underline">
          See all →
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {favorites.map((item) => (
          <li key={item.id}>
            <MenuItemCard
              item={item}
              categoryName={item.category_id ? categoryName.get(item.category_id) : null}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
