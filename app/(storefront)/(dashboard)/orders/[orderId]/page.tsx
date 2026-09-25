import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { BuyAgainButton } from "@/components/orders/buy-again-button";
import { OrderLiveRefresh } from "@/components/orders/live-refresh";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { getCurrentUser } from "@/lib/auth";
import { formatPoints } from "@/lib/loyalty";
import { formatNaira } from "@/lib/money";
import { buildTimeline, openCancelDeadline, statusLabel } from "@/lib/orders/status";
import { getSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { CancelOrderButton } from "./cancel-order-button";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

// Order tracking (docs/ui-components-and-styling.md §1). Owner (or staff)
// only — enforced by RLS; everyone else gets a 404. Updates live.
export default async function OrderPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`);

  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: history }, settings] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("order_status_history").select("status, changed_at").eq("order_id", orderId).order("changed_at"),
    getSiteSettings(),
  ]);
  if (!order) notFound();

  // Unpaid orders belong on the payment page, not the tracker.
  if (order.status === "pending_payment" && order.paystack_reference) {
    redirect(`/checkout/verify?reference=${encodeURIComponent(order.paystack_reference)}`);
  }

  const cancelled = order.status === "cancelled" || order.status === "failed";
  const steps = buildTimeline(order.status, order.fulfillment, history ?? []);
  const deadline = order.status === "paid" ? openCancelDeadline(order.paid_at) : null;
  // Dishes still on the menu, once each, for the "How was your food?" card.
  const reviewable = [
    ...new Map(
      (items ?? []).flatMap((i) => (i.menu_item_id ? [[i.menu_item_id, { id: i.menu_item_id, name: i.name }] as const] : [])),
    ).values(),
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:py-12">
      <OrderLiveRefresh orderId={order.id} channel={`order-${order.id}`} />

      <section className="flex flex-col gap-5 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-secondary">Order status</h1>
          <p className="mt-1 text-neutral-dark/70" aria-live="polite">
            Your current order status is:{" "}
            <strong className="text-secondary">{statusLabel(order.status, order.fulfillment)}</strong>
          </p>
        </div>

        {cancelled ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-900">
            <div>
              <p className="font-semibold">
                {order.status === "failed"
                  ? "Payment failed"
                  : order.cancelled_by === "customer"
                    ? "You cancelled this order"
                    : "We had to cancel this order"}
              </p>
              <p className="text-sm">
                {order.status === "failed"
                  ? "Payment for this order didn't go through."
                  : order.refunded_at
                    ? `Your refund of ${formatNaira(order.total)} has been issued to your original payment method.`
                    : order.cancelled_by === "customer"
                      ? `Your refund of ${formatNaira(order.total)} will be issued to your original payment method.`
                      : `Sorry about that — your ${formatNaira(order.total)} will be refunded to your original payment method.`}
              </p>
            </div>
          </div>
        ) : (
          <OrderTimeline steps={steps} />
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-8">
        <h2 className="font-display text-xl font-semibold text-secondary">Order details</h2>
        <ul className="flex flex-col divide-y divide-secondary/10">
          {items?.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2.5 text-sm">
              <span>
                {item.name} <span className="text-neutral-dark/65">× {item.quantity}</span>
              </span>
              <span className="tabular-nums">{formatNaira(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-secondary/10 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-dark/65">Subtotal</dt>
            <dd className="tabular-nums">{formatNaira(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-dark/65">{order.fulfillment === "pickup" ? "Pickup" : "Delivery"}</dt>
            <dd className="tabular-nums">{order.delivery_fee === 0 ? "Free" : formatNaira(order.delivery_fee)}</dd>
          </div>
          {order.referral_bonus_applied > 0 && (
            <div className="flex justify-between text-secondary">
              <dt>Referral bonus</dt>
              <dd className="tabular-nums">−{formatNaira(order.referral_bonus_applied)}</dd>
            </div>
          )}
          {order.loyalty_points_redeemed > 0 && (
            <div className="flex justify-between text-secondary">
              <dt>Loyalty points</dt>
              <dd className="tabular-nums">−{formatNaira(order.loyalty_points_redeemed)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatNaira(order.total)}</dd>
          </div>
        </dl>
        <p className="text-sm text-neutral-dark/65">
          {order.fulfillment === "pickup" ? "Pickup order" : `Delivering to: ${order.delivery_address}`}
        </p>
        {order.loyalty_points_earned > 0 && (
          <p className="text-sm font-medium text-secondary">
            You earned {formatPoints(order.loyalty_points_earned)} on this order.
          </p>
        )}
      </section>

      {order.status === "delivered" && reviewable.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-xl font-semibold text-secondary">How was your food?</h2>
          <p className="text-sm text-neutral-dark/70">Your review helps other customers choose.</p>
          <ul className="flex flex-col divide-y divide-secondary/10">
            {reviewable.map((dish) => (
              <li key={dish.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">{dish.name}</span>
                <Link
                  href={`/menu/${dish.id}#reviews`}
                  className="shrink-0 rounded-btn border border-secondary/25 px-3 py-1.5 font-medium text-secondary hover:bg-primary/30"
                >
                  Rate this dish
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {settings.whatsapp_number && (
        <section className="flex flex-col items-start gap-3 rounded-3xl bg-white card-accent p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm text-neutral-dark/70">Questions about this order?</p>
          <WhatsAppButton
            phone={settings.whatsapp_number}
            label="Message us"
            message={`Hi, I have a question about my order #${order.order_code}.`}
          />
        </section>
      )}

      {/* Footer bar: back · order meta · Buy again (secondary button). */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white card-accent px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/account/orders"
            aria-label="Back to your orders"
            className="flex size-10 items-center justify-center rounded-full border border-secondary/20 text-secondary hover:bg-primary/40"
          >
            ←
          </Link>
          <div className="text-sm">
            <p className="font-semibold">Order #{order.order_code}</p>
            <p className="text-neutral-dark/65">Placed {date(order.created_at)}</p>
            {/* Only rendered while the customer may still cancel — no countdown. */}
            {deadline && <CancelOrderButton orderId={order.id} deadline={deadline} />}
          </div>
        </div>
        <BuyAgainButton
          lines={(items ?? []).map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }))}
          className="rounded-btn bg-secondary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        />
      </div>
    </main>
  );
}
