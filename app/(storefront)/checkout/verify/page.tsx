import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { settlePayment, type SettleResult } from "@/lib/orders/settle";
import { isPaystackConfigured } from "@/lib/paystack";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import { retryPayment } from "../actions";
import { ClearCartOnMount } from "./clear-cart";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };

// Paystack's callback_url. Paystack appends ?reference=…&trxref=…
// Verify-on-return fallback (docs/cart-checkout-payment-workflow.md §4): if
// the webhook hasn't landed yet, this settles the payment itself. Both paths
// go through the same idempotent settlePayment(), so no double-processing.
export default async function VerifyPage({ searchParams }: PageProps<"/checkout/verify">) {
  const params = await searchParams;
  const reference = [params.reference, params.trxref].find((r) => typeof r === "string") as
    | string
    | undefined;
  // ?order=<id>: orders fully covered by rewards (no Paystack reference).
  const orderId = typeof params.order === "string" && z.uuid().safeParse(params.order).success ? params.order : null;
  if (!reference && !orderId) redirect("/cart");

  const user = await getCurrentUser();
  if (!user) {
    const back = reference ? `/checkout/verify?reference=${reference}` : `/checkout/verify?order=${orderId}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  // RLS: only the owner (or staff) can read this order.
  const supabase = await createClient();
  const loadOrder = async () =>
    (reference
      ? await supabase.from("orders").select("*").eq("paystack_reference", reference).maybeSingle()
      : await supabase.from("orders").select("*").eq("id", orderId!).maybeSingle()
    ).data;

  let order = await loadOrder();
  let settle: SettleResult | { outcome: "error" } = { outcome: "error" };
  // Only ask Paystack while the order is still unpaid (webhook may have won).
  if (reference && order?.status === "pending_payment" && params.init !== "failed" && isPaystackConfigured()) {
    try {
      settle = await settlePayment(reference, await requestOrigin());
      if (settle.outcome === "paid") order = await loadOrder();
    } catch (e) {
      console.error("verify-on-return failed:", reference, (e as Error).message);
    }
  }

  if (!order) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-semibold text-secondary">We couldn&apos;t find that payment</h1>
        <p className="text-neutral-dark/70">
          If you were charged, don&apos;t worry — it will be matched to your order shortly.
        </p>
        <Link href="/account" className="self-start rounded-btn bg-primary px-5 py-2.5 font-semibold text-secondary">
          Go to your account
        </Link>
      </Shell>
    );
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  if (order.status !== "pending_payment" && order.status !== "failed") {
    return (
      <Shell>
        <ClearCartOnMount />
        <div className="flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-primary text-3xl">
            ✓
          </span>
          <h1 className="font-display text-4xl font-semibold text-secondary">Thank you!</h1>
          <p className="text-neutral-dark/70">
            Order <strong>#{order.order_code}</strong> is confirmed — we&apos;re on it.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-secondary/10 rounded-2xl bg-neutral-light px-4">
          {items?.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
              <span>
                {item.name} <span className="text-neutral-dark/55">× {item.quantity}</span>
              </span>
              <span className="tabular-nums">{formatNaira(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1.5 text-sm">
          <Row label="Subtotal" value={formatNaira(order.subtotal)} />
          <Row
            label={order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
            value={order.delivery_fee === 0 ? "Free" : formatNaira(order.delivery_fee)}
          />
          {order.referral_bonus_applied > 0 && (
            <Row label="Referral bonus" value={`−${formatNaira(order.referral_bonus_applied)}`} />
          )}
          <Row label="Total paid" value={formatNaira(order.total)} strong />
        </dl>
        <p className="text-sm text-neutral-dark/70">
          {order.fulfillment === "pickup"
            ? "We'll let you know when it's ready to collect."
            : `Delivering to: ${order.delivery_address}`}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/orders/${order.id}`} className="rounded-btn bg-primary px-5 py-2.5 font-semibold text-secondary">
            Track your order
          </Link>
          <Link href="/menu" className="rounded-btn border border-secondary/30 px-5 py-2.5 font-medium text-secondary">
            Back to the menu
          </Link>
        </div>
      </Shell>
    );
  }

  // Not paid (yet): failed, abandoned, or Paystack couldn't be reached.
  const why =
    params.init === "failed"
      ? "We couldn't reach Paystack to start your payment."
      : settle.outcome === "not_paid"
        ? "Your payment wasn't completed."
        : "We couldn't confirm your payment just now.";

  return (
    <Shell>
      <h1 className="font-display text-3xl font-semibold text-secondary">Payment not completed</h1>
      <p className="text-neutral-dark/70">
        {why} Your order <strong>#{order.order_code}</strong> ({formatNaira(order.total)}) is saved — you
        haven&apos;t been charged for it yet.
      </p>
      <div className="flex flex-wrap gap-3">
        <form action={retryPayment}>
          <input type="hidden" name="order_id" value={order.id} />
          <button type="submit" className="rounded-btn bg-primary px-6 py-3 font-semibold text-secondary">
            Try payment again
          </button>
        </form>
        <Link href="/cart" className="rounded-btn border border-secondary/30 px-5 py-3 font-medium text-secondary">
          Back to cart
        </Link>
      </div>
      <p className="text-xs text-neutral-dark/55">
        If you completed payment and still see this, refresh in a minute — confirmations can take a moment.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 py-10 sm:py-16">
      <div className="flex animate-rise-in flex-col gap-5 rounded-3xl bg-white card-accent p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-secondary/10 pt-2 text-base font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-neutral-dark/65"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
