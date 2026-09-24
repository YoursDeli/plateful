"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

// Loads the persisted cart after mount (see skipHydration in the store) and
// keeps multiple open tabs in sync.
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === useCart.persist.getOptions().name) void useCart.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
