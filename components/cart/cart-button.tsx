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
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 7h12l-1.2 11.1a2 2 0 0 1-2 1.9H9.2a2 2 0 0 1-2-1.9L6 7Z" />
        <path d="M9 7V6a3 3 0 0 1 6 0v1" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-xs font-bold text-white tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
