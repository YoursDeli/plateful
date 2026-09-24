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

// "Share this dish" — plain WhatsApp share link for now; the styled
// WhatsAppButton from docs/ui-components-and-styling.md §3 replaces it in 8a.
export function ShareDishButton({ name }: { name: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const text = `${name} — ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }}
      className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/50 px-4 py-2 text-sm font-medium text-neutral-dark hover:bg-[#25D366]/10"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-[#25D366]">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" />
      </svg>
      Share this dish
    </button>
  );
}
