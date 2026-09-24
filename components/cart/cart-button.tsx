"use client";

import { cartCount, useCart } from "@/lib/cart/store";

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
      {/* Shopping cart: handle, basket, two wheels. */}
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 3.5h2.2l2.5 11.1a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 7.5H5.6" />
        <circle cx="9.5" cy="19.8" r="1.4" />
        <circle cx="17.3" cy="19.8" r="1.4" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-xs font-bold text-white tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
