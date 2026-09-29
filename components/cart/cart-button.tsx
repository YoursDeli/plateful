"use client";

import { cartCount, useCart } from "@/lib/cart/store";
import { CartIcon } from "@/components/ui/icons";

export function CartButton() {
  const count = useCart((s) => cartCount(s.items));
  const open = useCart((s) => s.open);

  return (
    <button
      type="button"
      onClick={open}
      aria-label={count > 0 ? `Open cart, ${count} item${count === 1 ? "" : "s"}` : "Open cart"}
      className="relative flex size-11 items-center justify-center rounded-full bg-primary text-secondary transition hover:brightness-95"
    >
      <CartIcon className="size-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-xs font-bold text-white tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
