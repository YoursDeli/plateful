import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { formatPoints } from "@/lib/loyalty";
import { formatNaira } from "@/lib/money";
import { statusLabel } from "@/lib/orders/status";
import { getSiteSettings } from "@/lib/site-settings";
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
  const [user, profile, settings] = await Promise.all([getCurrentUser(), getCurrentProfile(), getSiteSettings()]);
  if (!user) redirect("/login?next=/account/orders");
  const points = profile?.loyalty_points_balance ?? 0;
  // Show the points card while the program runs — or if they still hold points.
  const showPoints = settings.loyalty_enabled || points > 0;

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
        <h1 className="font-display text-4xl font-semibold text-secondary">Your orders</h1>
      </header>

      {showPoints && (
        <section aria-label="Loyalty points" className="flex flex-col gap-1 rounded-3xl bg-secondary card-accent-light p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-white/70">Loyalty points</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-primary">{formatPoints(points)}</p>
          </div>
          <p className="text-sm text-white/80 sm:max-w-xs sm:text-right">
            {settings.loyalty_enabled
              ? `Worth ${formatNaira(points)} at checkout. Earn ${settings.loyalty_points_per_1000} points for every ₦1,000 you spend, credited when each order is delivered.`
              : `Worth ${formatNaira(points)} — our points program is paused, but your balance is kept.`}
          </p>
        </section>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-secondary/20 px-6 py-14 text-center">
          <p className="font-display text-2xl text-secondary">No orders yet</p>
          <Link href="/menu" className="rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-secondary">
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
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white card-accent px-5 py-4 shadow-sm ring-1 ring-secondary/5 transition hover:bg-primary/20"
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
