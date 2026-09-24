"use client";

import { useCart } from "@/lib/cart/store";
import type { MenuItem } from "@/lib/supabase/types";
import { QuantityStepper } from "./quantity-stepper";

type CartableItem = Pick<MenuItem, "id" | "name" | "price" | "image_url" | "is_available">;

function toCartItem(item: CartableItem) {
  return {
    menuItemId: item.id,
    name: item.name,
    unitPrice: item.price,
    imageUrl: item.image_url,
  };
}

// "Add to cart" that becomes a quantity stepper once the dish is in the cart
// (docs/site-sections-and-features.md §2). Plain button for now — the
// LiquidButton styling lands in step 8a.
export function AddToCartControl({
  item,
  size = "md",
  label = "Add to cart",
}: {
  item: CartableItem;
  size?: "sm" | "md";
  label?: string;
}) {
  const quantity = useCart(
    (s) => s.items.find((i) => i.menuItemId === item.id)?.quantity ?? 0,
  );
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  if (!item.is_available) {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-dark/10 px-4 py-2 text-sm font-medium text-neutral-dark/60">
        Sold out
      </span>
    );
  }

  if (quantity > 0) {
    return (
      <QuantityStepper
        value={quantity}
        onChange={(q) => setQuantity(item.id, q)}
        label={item.name}
        size={size}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => add(toCartItem(item))}
      className={`rounded-full bg-primary font-semibold text-secondary transition hover:brightness-95 active:scale-[0.97] motion-reduce:transition-none ${
        size === "sm" ? "px-4 py-2 text-sm" : "px-6 py-2.5 text-base"
      }`}
    >
      {label}
    </button>
  );
}

// Detail page: pick a quantity first, then add that many.
export function AddQuantityButton({ item, quantity }: { item: CartableItem; quantity: number }) {
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  return (
    <button
      type="button"
      disabled={!item.is_available}
      onClick={() => {
        add(toCartItem(item), quantity);
        open();
      }}
      className="flex-1 rounded-full bg-primary px-6 py-3 text-base font-semibold text-secondary transition hover:brightness-95 active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
    >
      {item.is_available ? "Add to cart" : "Sold out today"}
    </button>
  );
}
