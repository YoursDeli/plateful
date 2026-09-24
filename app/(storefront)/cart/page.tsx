"use client";

import { CartContents } from "@/components/cart/cart-contents";
import { useCartRefresh } from "@/components/cart/use-cart-refresh";

// Full-page fallback for the slide-over cart (docs/pages-referrals-footer.md §1).
export default function CartPage() {
  useCartRefresh(true);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8 sm:py-12">
      <h1 className="font-display text-4xl font-semibold text-secondary">Your cart</h1>
      <CartContents />
    </main>
  );
}
