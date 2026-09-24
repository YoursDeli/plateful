import type { Fulfillment, OrderStatus } from "@/lib/supabase/types";

// Shared order-status vocabulary for the customer timeline and the admin
// dashboard. Transitions mirror set_order_status() — the DB is the authority.

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Payment failed",
};

export function statusLabel(status: OrderStatus, fulfillment: Fulfillment) {
  if (fulfillment === "pickup") {
    if (status === "ready") return "Ready for pickup";
    if (status === "delivered") return "Collected";
  }
  return STATUS_LABEL[status];
}

// Timeline rows (docs/ui-components-and-styling.md §1). Pickup orders skip
// "Out for delivery" and use pickup wording.
const STEPS: { status: OrderStatus; title: (f: Fulfillment) => string; description: (f: Fulfillment) => string }[] = [
  { status: "paid", title: () => "Confirmed", description: () => "We've received your order." },
  { status: "preparing", title: () => "Preparing", description: () => "We're getting your order ready." },
  {
    status: "ready",
    title: (f) => (f === "pickup" ? "Ready for pickup" : "Ready"),
    description: (f) => (f === "pickup" ? "Come and collect it whenever you're ready." : "Your order is ready."),
  },
  {
    status: "out_for_delivery",
    title: () => "Out for delivery",
    description: () => "Handed to our rider — on its way to you.",
  },
  {
    status: "delivered",
    title: (f) => (f === "pickup" ? "Collected" : "Delivered"),
    description: (f) => (f === "pickup" ? "Enjoy your meal!" : "Successfully delivered. Enjoy!"),
  },
];

export type TimelineStep = {
  key: OrderStatus;
  title: string;
  description: string;
  state: "completed" | "current" | "future";
  timestamp: string | null;
};

export function buildTimeline(
  status: OrderStatus,
  fulfillment: Fulfillment,
  history: { status: OrderStatus; changed_at: string }[],
): TimelineStep[] {
  const steps = STEPS.filter((s) => fulfillment === "delivery" || s.status !== "out_for_delivery");
  const currentIndex = steps.findIndex((s) => s.status === status);
  // Latest timestamp per status.
  const at = new Map(history.map((h) => [h.status, h.changed_at]));

  return steps.map((s, i) => {
    const state =
      currentIndex === -1 ? "future" : i < currentIndex ? "completed" : i === currentIndex ? "current" : "future";
    return {
      key: s.status,
      title: s.title(fulfillment),
      description: s.description(fulfillment),
      // The final step is "completed", not "in progress".
      state: state === "current" && s.status === "delivered" ? "completed" : state,
      timestamp: state === "future" ? null : (at.get(s.status) ?? null),
    };
  });
}

// Admin: the forward move(s) available from each status.
export function nextActions(
  status: OrderStatus,
  fulfillment: Fulfillment,
): { status: OrderStatus; label: string }[] {
  switch (status) {
    case "paid":
      return [{ status: "preparing", label: "Start preparing" }];
    case "preparing":
      return [{ status: "ready", label: fulfillment === "pickup" ? "Ready for pickup" : "Mark ready" }];
    case "ready":
      return fulfillment === "delivery"
        ? [{ status: "out_for_delivery", label: "Out for delivery" }]
        : [{ status: "delivered", label: "Mark collected" }];
    case "out_for_delivery":
      return [{ status: "delivered", label: "Mark delivered" }];
    default:
      return [];
  }
}

export function canCancel(status: OrderStatus) {
  return status === "paid" || status === "preparing";
}

export const ACTIVE_STATUSES: OrderStatus[] = ["paid", "preparing", "ready", "out_for_delivery"];

// Customer self-cancel window (must match cancel_my_order() in SQL). Starts at
// payment, and only while the order is still "Confirmed" (status paid).
export const CANCEL_WINDOW_MINUTES = 30;

// Deadline for customer self-cancel, or null if it has already passed.
export function openCancelDeadline(paidAt: string | null) {
  if (!paidAt) return null;
  const deadline = new Date(paidAt).getTime() + CANCEL_WINDOW_MINUTES * 60_000;
  return deadline > Date.now() ? new Date(deadline).toISOString() : null;
}
