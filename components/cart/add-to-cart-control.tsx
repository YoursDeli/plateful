"use client";

import { CtaButton } from "@/components/ui/cta-button";
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
// (docs/site-sections-and-features.md §2). Uses the animated CtaButton.
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
      <span className="inline-flex items-center rounded-btn bg-neutral-dark/10 px-4 py-2 text-sm font-medium text-neutral-dark/65">
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
    <CtaButton size={size} onClick={() => add(toCartItem(item))}>
      {label}
    </CtaButton>
  );
}

// Detail page: pick a quantity first, then add that many.
export function AddQuantityButton({ item, quantity }: { item: CartableItem; quantity: number }) {
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  return (
    <div className="flex-1">
      <CtaButton
        size="lg"
        fullWidth
        disabled={!item.is_available}
        onClick={() => {
          add(toCartItem(item), quantity);
          open();
        }}
      >
        {item.is_available ? "Add to cart" : "Sold out today"}
      </CtaButton>
    </div>
  );
}
