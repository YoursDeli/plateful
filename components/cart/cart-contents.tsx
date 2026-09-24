"use client";

import Image from "next/image";
import Link from "next/link";
import { cartSubtotal, useCart, type CartItemNotice } from "@/lib/cart/store";
import { formatNaira } from "@/lib/money";
import { QuantityStepper } from "./quantity-stepper";

const NOTICE_TEXT: Record<CartItemNotice, string> = {
  price_changed: "Price updated since you added this.",
  unavailable: "Sold out right now — remove it to check out.",
  removed: "No longer on the menu — please remove it.",
};

// Shared by the slide-over panel and the /cart page.
export function CartContents({ onNavigate }: { onNavigate?: () => void }) {
  const items = useCart((s) => s.items);
  const notices = useCart((s) => s.notices);
  const hasHydrated = useCart((s) => s.hasHydrated);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  if (!hasHydrated) {
    return <p className="py-10 text-center text-sm text-neutral-dark/50">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="font-display text-xl text-secondary">Your cart is empty</p>
        <p className="text-sm text-neutral-dark/60">Find something delicious on the menu.</p>
        <Link
          href="/menu"
          onClick={onNavigate}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-secondary"
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  const blocked = items.some(
    (i) => notices[i.menuItemId] === "unavailable" || notices[i.menuItemId] === "removed",
  );

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-secondary/10">
        {items.map((item) => (
          <li key={item.menuItemId} className="flex gap-3 py-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-primary/30">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/menu/${item.menuItemId}`}
                  onClick={onNavigate}
                  className="font-medium leading-snug hover:underline"
                >
                  {item.name}
                </Link>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatNaira(item.unitPrice * item.quantity)}
                </span>
              </div>
              {notices[item.menuItemId] && (
                <p className="text-xs text-red-700">{NOTICE_TEXT[notices[item.menuItemId]]}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => setQuantity(item.menuItemId, q)}
                  label={item.name}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => remove(item.menuItemId)}
                  className="text-xs text-neutral-dark/60 underline hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t border-secondary/10 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-dark/70">Subtotal</span>
          <span className="text-lg font-semibold tabular-nums">{formatNaira(cartSubtotal(items))}</span>
        </div>
        <p className="text-xs text-neutral-dark/60">
          Delivery fee and any rewards are applied at checkout.
        </p>
        {blocked ? (
          <span className="w-full cursor-not-allowed rounded-full bg-secondary/50 px-5 py-3 text-center font-semibold text-white">
            Checkout
          </span>
        ) : (
          <Link
            href="/checkout"
            onClick={onNavigate}
            className="w-full rounded-full bg-secondary px-5 py-3 text-center font-semibold text-white transition hover:brightness-110"
          >
            Checkout
          </Link>
        )}
        {blocked && (
          <p className="text-xs text-red-700">Remove sold-out items before checking out.</p>
        )}
      </div>
    </div>
  );
}
