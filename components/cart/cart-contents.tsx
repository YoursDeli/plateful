"use client";

import Image from "next/image";
import Link from "next/link";
import { BLOCKING_NOTICES, cartSubtotal, useCart, type CartItemNotice } from "@/lib/cart/store";
import { formatNaira } from "@/lib/money";
import { CartSuggestions } from "./cart-suggestions";
import { QuantityStepper } from "./quantity-stepper";
import { LiquidButton } from "@/components/ui/liquid-button";

const NOTICE_TEXT: Record<CartItemNotice, string> = {
  price_changed: "Price updated since you added this.",
  unavailable: "Sold out right now — remove it to check out.",
  removed: "No longer on the menu — please remove it.",
  size_removed: "This bowl size is no longer offered — please remove it and choose another.",
  needs_size: "This dish now comes in bowl sizes — please remove it and add it again with a size.",
};

// Shared by the slide-over panel and the /cart page.
export function CartContents({ onNavigate }: { onNavigate?: () => void }) {
  const items = useCart((s) => s.items);
  const notices = useCart((s) => s.notices);
  const hasHydrated = useCart((s) => s.hasHydrated);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  if (!hasHydrated) {
    return <p className="py-10 text-center text-sm text-neutral-dark/65">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="font-display text-xl text-secondary">Your cart is empty</p>
        <p className="text-sm text-neutral-dark/65">Find something delicious on the menu.</p>
        <LiquidButton href="/menu" onClick={onNavigate}>
          Browse the menu
        </LiquidButton>
      </div>
    );
  }

  const blocked = items.some((i) => notices[i.key] && BLOCKING_NOTICES.includes(notices[i.key]));

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-secondary/10">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3 py-4">
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
                  {item.sizeName && (
                    <span className="block text-xs font-normal text-neutral-dark/70">{item.sizeName}</span>
                  )}
                </Link>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatNaira(item.unitPrice * item.quantity)}
                </span>
              </div>
              {notices[item.key] && <p className="text-xs text-red-700">{NOTICE_TEXT[notices[item.key]]}</p>}
              <div className="flex items-center justify-between gap-2">
                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => setQuantity(item.key, q)}
                  label={item.name}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  className="text-xs text-neutral-dark/65 underline hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <CartSuggestions onNavigate={onNavigate} />

      <div className="flex flex-col gap-3 border-t border-secondary/10 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-dark/70">Subtotal</span>
          <span className="text-lg font-semibold tabular-nums">{formatNaira(cartSubtotal(items))}</span>
        </div>
        <p className="text-xs text-neutral-dark/65">
          Delivery fee and any rewards are applied at checkout.
        </p>
        {blocked ? (
          <span className="w-full cursor-not-allowed rounded-btn bg-secondary/50 px-5 py-3 text-center font-semibold text-white">
            Checkout
          </span>
        ) : (
          <Link
            href="/checkout"
            onClick={onNavigate}
            className="w-full rounded-btn bg-secondary px-5 py-3 text-center font-semibold text-white transition hover:brightness-110"
          >
            Checkout
          </Link>
        )}
        {blocked && (
          <p className="text-xs text-red-700">Fix the items marked above before checking out.</p>
        )}
      </div>
    </div>
  );
}
