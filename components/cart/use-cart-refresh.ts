"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";
import { createClient } from "@/lib/supabase/client";

// Re-checks cart lines against the live menu whenever `active` becomes true
// (panel opened / cart page shown): updates names, images and display prices,
// and flags dishes whose price changed or that sold out / were removed
// (docs/cart-checkout-payment-workflow.md §7). Checkout re-prices server-side
// regardless — this only keeps what the customer sees honest.
export function useCartRefresh(active: boolean) {
  const hasHydrated = useCart((s) => s.hasHydrated);

  useEffect(() => {
    if (!active || !hasHydrated) return;
    const ids = useCart.getState().items.map((i) => i.menuItemId);
    if (ids.length === 0) return;

    let cancelled = false;
    void createClient()
      .from("menu_items")
      .select("id, name, price, image_url, is_available")
      .in("id", ids)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        useCart.getState().applyRefresh(
          new Map(
            data.map((d) => [
              d.id,
              { name: d.name, price: d.price, imageUrl: d.image_url, isAvailable: d.is_available },
            ]),
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [active, hasHydrated]);
}
