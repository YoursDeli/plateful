import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { ACTIVE_STATUSES, canCancel, nextActions, statusLabel } from "@/lib/orders/status";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";
import { markRefunded, updateOrderStatus } from "./actions";
import { LiveBoard } from "./live-board";

export const metadata: Metadata = { title: "Orders" };

const TABS = {
  active: { label: "Active", statuses: ACTIVE_STATUSES },
  completed: { label: "Completed", statuses: ["delivered"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
  // Abandoned checkouts: kept out of the main views (cart doc §4).
  unpaid: { label: "Unpaid", statuses: ["pending_payment", "failed"] },
} satisfies Record<string, { label: string; statuses: OrderStatus[] }>;
type Tab = keyof typeof TABS;

// Server component rendered per request — reading the clock here is fine.
const daysAgoIso = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });

const pill: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  paid: "bg-amber-400 text-neutral-dark",
  preparing: "bg-primary text-secondary",
  ready: "bg-green-100 text-green-900",
  out_for_delivery: "bg-sky-100 text-sky-900",
  delivered: "bg-secondary text-white",
};

// docs/site-sections-and-features.md §8: incoming orders in real time,
// status updates, customer contact/delivery info. Mobile-first — the vendor
// will likely run this from a phone.
export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff("/admin/orders");
  const { tab: rawTab } = await searchParams;
  const tab: Tab = typeof rawTab === "string" && rawTab in TABS ? (rawTab as Tab) : "active";

  const supabase = await createClient();
  // Lazy cleanup: unpaid checkouts older than 24h → failed, bonuses returned.
  await supabase.rpc("expire_stale_orders");

  let query = supabase
    .from("orders")
    .select("*")
    .in("status", TABS[tab].statuses)
    .order("created_at", { ascending: tab === "active" }) // active: oldest first (kitchen queue)
    .limit(tab === "active" ? 100 : 50);
  if (tab === "unpaid") {
    query = query.gte("created_at", daysAgoIso(7));
  }
  const [{ data: orders, error }, { count: activeCount }] = await Promise.all([
    query,
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ACTIVE_STATUSES),
  ]);
  if (error) throw new Error("Couldn't load orders.");

  const ids = orders.map((o) => o.id);
  const { data: items } =
    ids.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", ids)
      : { data: [] as OrderItem[] };
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items ?? []) {
    itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), item]);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Orders</h1>
      </div>
      <LiveBoard />

      <nav aria-label="Order status" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={t === "active" ? "/admin/orders" : `/admin/orders?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`shrink-0 rounded-btn px-4 py-2 text-sm font-medium ${
              t === tab ? "bg-secondary text-white" : "bg-white text-secondary ring-1 ring-secondary/15"
            }`}
          >
            {TABS[t].label}
            {t === "active" && activeCount ? ` (${activeCount})` : ""}
          </Link>
        ))}
      </nav>

      {tab === "unpaid" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Checkouts from the last 7 days that were never paid — usually abandoned. No action needed.
        </p>
      )}

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-dark/20 p-8 text-center text-sm text-neutral-dark/60">
          {tab === "active" ? "No active orders right now. New paid orders will pop up here." : "Nothing here yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} items={itemsByOrder.get(order.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order, items }: { order: Order; items: OrderItem[] }) {
  const actions = nextActions(order.status, order.fulfillment);
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-secondary/5 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl font-semibold text-secondary">#{order.order_code}</p>
          <p className="text-xs text-neutral-dark/55">{when(order.paid_at ?? order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-neutral-dark/5 px-2.5 py-1 text-xs font-medium">
            {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pill[order.status]}`}>
            {statusLabel(order.status, order.fulfillment)}
          </span>
        </div>
      </header>

      <div className="text-sm">
        <p className="font-medium">{order.contact_name}</p>
        <p className="flex flex-wrap gap-x-3">
          <a href={`tel:${order.contact_phone.replace(/\s/g, "")}`} className="text-secondary underline">
            {order.contact_phone}
          </a>
          <a href={`mailto:${order.contact_email}`} className="truncate text-neutral-dark/60 underline">
            {order.contact_email}
          </a>
        </p>
        {order.fulfillment === "delivery" && (
          <p className="mt-1 text-neutral-dark/80">{order.delivery_address}</p>
        )}
      </div>

      {order.status === "cancelled" && order.paid_at && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
          <span>
            Cancelled by {order.cancelled_by === "customer" ? "the customer" : "the restaurant"}
            {order.cancelled_at ? ` · ${when(order.cancelled_at)}` : ""} ·{" "}
            {order.refunded_at ? <strong>Refunded</strong> : <strong>Refund due — issue it in Paystack</strong>}
          </span>
          {!order.refunded_at && (
            <form action={markRefunded}>
              <input type="hidden" name="order_id" value={order.id} />
              <ConfirmSubmitButton
                message={`Confirm you've refunded ${formatNaira(order.total)} for order #${order.order_code} in Paystack?`}
                className="rounded-btn bg-white px-3 py-1.5 text-xs font-semibold text-red-800 ring-1 ring-red-200 hover:bg-red-100"
              >
                Mark refunded
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      )}

      {order.notes && (
        <p className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm">
          <strong>Notes:</strong> {order.notes}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-secondary/10 rounded-xl bg-neutral-light px-3 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2 py-2">
            <span>
              <strong className="text-secondary">{item.quantity}×</strong> {item.name}
            </span>
            <span className="tabular-nums text-neutral-dark/60">{formatNaira(item.line_total)}</span>
          </li>
        ))}
      </ul>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="text-sm">
          <span className="text-neutral-dark/60">Total </span>
          <strong className="tabular-nums">{formatNaira(order.total)}</strong>
          {order.delivery_fee > 0 && (
            <span className="text-xs text-neutral-dark/50"> (incl. {formatNaira(order.delivery_fee)} delivery)</span>
          )}
          {order.referral_bonus_applied > 0 && (
            <span className="block text-xs text-secondary">
              {formatNaira(order.referral_bonus_applied)} paid with referral bonus
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {canCancel(order.status) && (
            <form action={updateOrderStatus}>
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="status" value="cancelled" />
              <ConfirmSubmitButton
                message={`Cancel order #${order.order_code}? The customer has paid — refund ${formatNaira(order.total)} in your Paystack dashboard, then tap "Mark refunded".`}
                className="rounded-btn px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Cancel
              </ConfirmSubmitButton>
            </form>
          )}
          {actions.map((a) => (
            <form key={a.status} action={updateOrderStatus}>
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="status" value={a.status} />
              <button
                type="submit"
                className="rounded-btn bg-secondary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                {a.label} →
              </button>
            </form>
          ))}
        </div>
      </footer>
    </article>
  );
}
