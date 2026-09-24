"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/store";
import { createClient } from "@/lib/supabase/client";

// "Add all items from this order to cart" (docs/site-sections-and-features.md
// §7). Uses TODAY's menu — current price, only dishes still on the menu and
// available — then opens the cart so the customer sees exactly what was added.
export function BuyAgainButton({
  lines,
  className,
}: {
  lines: { menu_item_id: string | null; quantity: number }[];
  className?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ids = lines.map((l) => l.menu_item_id).filter((id): id is string => Boolean(id));

  async function buyAgain() {
    setMessage(null);
    if (ids.length === 0) {
      setMessage("These dishes are no longer on the menu.");
      return;
    }
    setPending(true);
    const { data } = await createClient()
      .from("menu_items")
      .select("id, name, price, image_url, is_available")
      .in("id", ids);
    const available = new Map((data ?? []).filter((d) => d.is_available).map((d) => [d.id, d]));

    const cart = useCart.getState();
    let added = 0;
    for (const line of lines) {
      const dish = line.menu_item_id ? available.get(line.menu_item_id) : undefined;
      if (!dish) continue;
      cart.add({ menuItemId: dish.id, name: dish.name, unitPrice: dish.price, imageUrl: dish.image_url }, line.quantity);
      added++;
    }
    setPending(false);

    const skipped = lines.length - added;
    if (added === 0) {
      setMessage("None of these dishes are available right now.");
      return;
    }
    if (skipped > 0) setMessage(`${skipped} dish${skipped === 1 ? " isn't" : "es aren't"} available today — added the rest.`);
    cart.open();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={() => void buyAgain()} disabled={pending} className={className}>
        {pending ? "Adding…" : "Buy again"}
      </button>
      {message && <p role="status" className="text-right text-xs text-neutral-dark/60">{message}</p>}
    </div>
  );
}
