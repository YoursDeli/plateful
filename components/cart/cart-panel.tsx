"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart/store";
import { CartContents } from "./cart-contents";
import { useCartRefresh } from "./use-cart-refresh";

// Slide-over cart (docs/site-sections-and-features.md §4). Native <dialog>
// gives focus trapping, Esc-to-close and an inert page behind it for free.
export function CartPanel() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const ref = useRef<HTMLDialogElement>(null);

  useCartRefresh(isOpen);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-title"
      onClose={close}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md bg-neutral-light p-0 shadow-2xl backdrop:bg-secondary/40 backdrop:backdrop-blur-sm open:animate-slide-in"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-secondary/10 px-5 py-4">
          <h2 id="cart-title" className="font-display text-2xl font-semibold text-secondary">
            Your cart
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="flex size-10 items-center justify-center rounded-full text-2xl text-secondary hover:bg-primary/40"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <CartContents onNavigate={close} />
        </div>
      </div>
    </dialog>
  );
}
