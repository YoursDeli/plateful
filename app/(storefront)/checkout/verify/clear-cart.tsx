"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

// Empties the cart once the order is confirmed paid (after the persisted cart
// has loaded, so the rehydration can't bring the old items back).
export function ClearCartOnMount() {
  const hasHydrated = useCart((s) => s.hasHydrated);
  useEffect(() => {
    if (hasHydrated) useCart.getState().clear();
  }, [hasHydrated]);
  return null;
}
