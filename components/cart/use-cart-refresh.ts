"use client";

import { useEffect } from "react";
import { useCart, type FreshDish } from "@/lib/cart/store";
import { createClient } from "@/lib/supabase/client";

// Re-checks cart lines against the live menu whenever `active` becomes true
// (panel opened / cart page shown): updates names, images and display prices
// (per bowl size), and flags dishes whose price changed, that sold out / were
// removed, or whose size is no longer offered
// (docs/cart-checkout-payment-workflow.md §7). Checkout re-prices server-side
// regardless — this only keeps what the customer sees honest.
// Pass a new `trigger` value to force a re-check (e.g. the checkout response
// that reported a sold-out dish).
export function useCartRefresh(active: boolean, trigger: unknown = null) {
  const hasHydrated = useCart((s) => s.hasHydrated);

  useEffect(() => {
    if (!active || !hasHydrated) return;
    const ids = [...new Set(useCart.getState().items.map((i) => i.menuItemId))];
    if (ids.length === 0) return;

    let cancelled = false;
    const supabase = createClient();
    void Promise.all([
      supabase.from("menu_items").select("id, name, price, image_url, is_available").in("id", ids),
      supabase.from("menu_item_sizes").select("menu_item_id, size_id, price").in("menu_item_id", ids),
      supabase.from("bowl_sizes").select("id, name"),
    ]).then(([dishes, prices, sizes]) => {
      if (cancelled || dishes.error || prices.error || sizes.error) return;
      const sizeName = new Map(sizes.data.map((s) => [s.id, s.name]));
      const fresh = new Map<string, FreshDish>(
        dishes.data.map((d) => [
          d.id,
          { name: d.name, price: d.price, imageUrl: d.image_url, isAvailable: d.is_available, sizes: new Map() },
        ]),
      );
      for (const row of prices.data) {
        fresh.get(row.menu_item_id)?.sizes.set(row.size_id, {
          name: sizeName.get(row.size_id) ?? "",
          price: row.price,
        });
      }
      useCart.getState().applyRefresh(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, [active, hasHydrated, trigger]);
}
