"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PriceRow } from "@/components/menu/price-row";
import { useCart } from "@/lib/cart/store";
import { createClient } from "@/lib/supabase/client";
import type { DishSize, MenuItem } from "@/lib/supabase/types";
import { AddToCartControl } from "./add-to-cart-control";

type Suggestion = Pick<MenuItem, "id" | "name" | "price" | "compare_at_price" | "image_url" | "is_available"> & {
  sizes: DishSize[];
};

const MAX = 4;

// "Complete your meal" upsell in the cart (client): for each dish in the
// cart, suggest dishes from its category's "goes well with" categories
// (e.g. Soup → Swallow, Rice → Protein / Sides and Extras). A paired category
// is skipped once the cart already has something from it.
export function CartSuggestions({ onNavigate }: { onNavigate?: () => void }) {
  const dishIds = useCart((s) => [...new Set(s.items.map((i) => i.menuItemId))].sort().join(","));
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const ids = dishIds ? dishIds.split(",") : [];
    let cancelled = false;
    void loadSuggestions(ids).then((next) => {
      if (!cancelled) setSuggestions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [dishIds]);

  if (suggestions.length === 0) return null;

  return (
    <section aria-labelledby="cart-suggestions-heading" className="flex flex-col gap-3 rounded-2xl bg-white card-accent p-4 shadow-sm">
      <h3 id="cart-suggestions-heading" className="font-display text-lg font-semibold text-secondary">
        Complete your meal
      </h3>
      <ul className="flex flex-col gap-3">
        {suggestions.map((dish) => (
          <li key={dish.id} className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-primary/30">
              {dish.image_url && <Image src={dish.image_url} alt="" fill sizes="56px" className="object-cover" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/menu/${dish.id}`} onClick={onNavigate} className="truncate text-sm font-medium hover:underline">
                {dish.name}
              </Link>
              <div className="text-sm [&_strong]:text-sm">
                <PriceRow item={dish} />
              </div>
            </div>
            <div className="shrink-0">
              <AddToCartControl item={dish} size="sm" label="Add" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function loadSuggestions(cartDishIds: string[]): Promise<Suggestion[]> {
  if (cartDishIds.length === 0) return [];
  const supabase = createClient();

  const [{ data: cartDishes }, { data: categories }] = await Promise.all([
    supabase.from("menu_items").select("id, category_id").in("id", cartDishIds),
    supabase.from("categories").select("id, sort_order, upsell_category_ids").order("sort_order"),
  ]);
  if (!cartDishes || !categories) return [];

  const inCart = new Set(cartDishes.map((d) => d.category_id).filter(Boolean));
  const pairs = new Map(categories.map((c) => [c.id, c.upsell_category_ids]));
  const targets = [
    ...new Set(
      cartDishes.flatMap((d) => (d.category_id ? (pairs.get(d.category_id) ?? []) : [])).filter((id) => !inCart.has(id)),
    ),
  ];
  if (targets.length === 0) return [];

  const { data: dishes } = await supabase
    .from("menu_items")
    .select("id, name, price, compare_at_price, image_url, is_available, category_id, badge")
    .in("category_id", targets)
    .eq("is_available", true);
  if (!dishes || dishes.length === 0) return [];
  const [{ data: prices }, { data: sizes }] = await Promise.all([
    supabase.from("menu_item_sizes").select("menu_item_id, size_id, price").in("menu_item_id", dishes.map((d) => d.id)),
    supabase.from("bowl_sizes").select("id, name, sort_order").order("sort_order"),
  ]);
  if (!prices || !sizes) return [];

  const cartSet = new Set(cartDishIds);
  const order = new Map(targets.map((id, i) => [id, i]));
  return dishes
    .filter((d) => !cartSet.has(d.id))
    .sort(
      (a, b) =>
        order.get(a.category_id!)! - order.get(b.category_id!)! ||
        Number(b.badge === "Bestseller") - Number(a.badge === "Bestseller"),
    )
    .slice(0, MAX)
    .map((d) => ({
      ...d,
      sizes: sizes.flatMap((s) => {
        const row = prices.find((p) => p.menu_item_id === d.id && p.size_id === s.id);
        return row ? [{ id: s.id, name: s.name, price: row.price }] : [];
      }),
    }));
}
