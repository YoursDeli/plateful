"use client";

import { useState } from "react";
import { AddQuantityButton } from "@/components/cart/add-to-cart-control";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import type { MenuItem } from "@/lib/supabase/types";

// Item page: choose a quantity, then add it (opens the cart panel).
export function ProductPurchase({
  item,
}: {
  item: Pick<MenuItem, "id" | "name" | "price" | "image_url" | "is_available">;
}) {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {item.is_available && (
        <QuantityStepper value={qty} onChange={setQty} min={1} label={item.name} />
      )}
      <AddQuantityButton item={item} quantity={qty} />
    </div>
  );
}
