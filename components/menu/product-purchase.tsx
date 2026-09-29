"use client";

import { useState } from "react";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { SizeOptions } from "@/components/cart/size-picker";
import { CtaButton } from "@/components/ui/cta-button";
import { useCart } from "@/lib/cart/store";
import { formatNaira } from "@/lib/money";
import type { DishSize, MenuItem } from "@/lib/supabase/types";
import { CartIcon } from "@/components/ui/icons";

// Dish page: choose a bowl size (if the dish has sizes) and a quantity, then
// add them (opens the cart panel).
export function ProductPurchase({
  item,
}: {
  item: Pick<MenuItem, "id" | "name" | "price" | "image_url" | "is_available"> & { sizes: DishSize[] };
}) {
  const [qty, setQty] = useState(1);
  const [sizeId, setSizeId] = useState(item.sizes[0]?.id ?? "");
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  const size = item.sizes.find((s) => s.id === sizeId) ?? null;
  const unitPrice = size ? size.price : item.price;

  return (
    <div className="flex flex-col gap-4">
      {item.is_available && item.sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-secondary">Choose a bowl size</p>
          <SizeOptions name={`size-${item.id}`} sizes={item.sizes} value={sizeId} onChange={setSizeId} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {item.is_available && <QuantityStepper value={qty} onChange={setQty} min={1} label={item.name} />}
        <div className="flex-1">
          <CtaButton
            size="lg"
            fullWidth
            disabled={!item.is_available}
            onClick={() => {
              add(
                {
                  menuItemId: item.id,
                  sizeId: size?.id ?? null,
                  sizeName: size?.name ?? null,
                  name: item.name,
                  unitPrice,
                  imageUrl: item.image_url,
                },
                qty,
              );
              open();
            }}
          >
            {item.is_available && <CartIcon className="size-[1.15em] shrink-0" />}
            {item.is_available ? `Add to cart · ${formatNaira(unitPrice * qty)}` : "Sold out today"}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
