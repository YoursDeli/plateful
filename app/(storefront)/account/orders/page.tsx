import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { statusLabel } from "@/lib/orders/status";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

const pill: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  paid: "bg-primary text-secondary",
  preparing: "bg-primary text-secondary",
  ready: "bg-primary text-secondary",
  out_for_delivery: "bg-primary text-secondary",
  delivered: "bg-secondary text-white",
};

// Order history (docs/site-sections-and-features.md §7). RLS = own orders only.
export default async function OrderHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/orders");

  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_code, status, fulfillment, total, created_at, paystack_reference")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Couldn't load your orders.");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <Link href="/account" className="text-sm text-secondary underline-offset-4 hover:underline">← Your account</Link>
        <h1 className="font-display text-4xl font-semibold text-secondary">Your orders</h1>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-secondary/20 px-6 py-14 text-center">
          <p className="font-display text-2xl text-secondary">No orders yet</p>
          <Link href="/menu" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-secondary">
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const href =
              o.status === "pending_payment" && o.paystack_reference
                ? `/checkout/verify?reference=${encodeURIComponent(o.paystack_reference)}`
                : `/orders/${o.id}`;
            return (
              <li key={o.id}>
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-secondary/5 transition hover:bg-primary/20"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold">Order #{o.order_code}</span>
                    <span className="text-xs text-neutral-dark/55">
                      {new Date(o.created_at).toLocaleDateString("en-NG", {
                        timeZone: "Africa/Lagos",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {o.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{formatNaira(o.total)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pill[o.status]}`}>
                      {statusLabel(o.status, o.fulfillment)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
