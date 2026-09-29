"use client";

import { CtaButton } from "@/components/ui/cta-button";
import { LiquidButton } from "@/components/ui/liquid-button";
import { lineKey, useCart } from "@/lib/cart/store";
import type { DishSize, MenuItem } from "@/lib/supabase/types";
import { QuantityStepper } from "./quantity-stepper";
import { SizePickerButton } from "./size-picker";
import { CartIcon } from "@/components/ui/icons";

type CartableItem = Pick<MenuItem, "id" | "name" | "price" | "image_url" | "is_available"> & {
  sizes?: DishSize[];
};

// "Add to cart" that becomes a quantity stepper once the dish is in the cart
// (docs/site-sections-and-features.md §2). Dishes sold in bowl sizes open the
// size picker instead. Uses the animated CtaButton.
export function AddToCartControl({
  item,
  size = "md",
  label = "Add to cart",
  fullWidth = false,
  variant = "cta",
}: {
  item: CartableItem;
  size?: "sm" | "md";
  label?: string;
  fullWidth?: boolean;
  variant?: "cta" | "liquid"; // "liquid" = the client's Liquid button (hero)
}) {
  const key = lineKey(item.id, null);
  const quantity = useCart((s) => s.items.find((i) => i.key === key)?.quantity ?? 0);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  if (!item.is_available) {
    return (
      <span className={`items-center justify-center rounded-btn bg-neutral-dark/10 px-4 py-2 text-sm font-medium text-neutral-dark/65 ${fullWidth ? "flex w-full" : "inline-flex"}`}>
        Sold out
      </span>
    );
  }

  if (item.sizes && item.sizes.length > 0) {
    return (
      <SizePickerButton
        dish={{ ...item, sizes: item.sizes }}
        label={label}
        size={size}
        fullWidth={fullWidth}
        variant={variant}
      />
    );
  }

  if (quantity > 0) {
    return (
      <QuantityStepper value={quantity} onChange={(q) => setQuantity(key, q)} label={item.name} size={size} fullWidth={fullWidth} />
    );
  }

  const addPlain = () =>
    add({
      menuItemId: item.id,
      sizeId: null,
      sizeName: null,
      name: item.name,
      unitPrice: item.price,
      imageUrl: item.image_url,
    });

  if (variant === "liquid") {
    return (
      <LiquidButton fullWidth={fullWidth} onClick={addPlain}>
        <CartIcon className="size-[1.15em] shrink-0" />
        {label}
      </LiquidButton>
    );
  }

  return (
    <CtaButton size={size} fullWidth={fullWidth} onClick={addPlain}>
      <CartIcon className="size-[1.15em] shrink-0" />
      {label}
    </CtaButton>
  );
}
