"use client";

import { useCallback, useState } from "react";
import { OrderLiveRefresh } from "@/components/orders/live-refresh";

type Alert = { id: string; code: string; kind: "new" | "cancelled" };

// Keeps the board live (Supabase Realtime → router.refresh()) and flashes a
// banner when a newly PAID order arrives or a customer cancels one, so staff
// on a phone notice before cooking it.
export function LiveBoard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const onEvent = useCallback(
    (row: { id: string; status: string; order_code: string; cancelled_by?: string | null }) => {
      const kind =
        row?.status === "paid" ? "new" : row?.status === "cancelled" && row.cancelled_by === "customer" ? "cancelled" : null;
      if (!kind) return;
      setAlerts((current) =>
        current.some((a) => a.id === row.id && a.kind === kind)
          ? current
          : [...current, { id: row.id, code: row.order_code, kind }],
      );
    },
    [],
  );
  const fresh = alerts.filter((a) => a.kind === "new");
  const cancelled = alerts.filter((a) => a.kind === "cancelled");

  return (
    <>
      <OrderLiveRefresh channel="admin-orders" onEvent={onEvent} />
      {alerts.length > 0 && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3 text-white shadow-lg">
          <span className="flex flex-col font-semibold">
            {fresh.length > 0 && (
              <span>New order{fresh.length > 1 ? "s" : ""}: {fresh.map((a) => `#${a.code}`).join(", ")}</span>
            )}
            {cancelled.length > 0 && (
              <span className="text-primary">
                Cancelled by customer: {cancelled.map((a) => `#${a.code}`).join(", ")} — don&apos;t prepare
              </span>
            )}
          </span>
          <button type="button" onClick={() => setAlerts([])} className="rounded-btn px-3 py-1 text-sm text-primary hover:bg-white/10">
            Dismiss
          </button>
        </div>
      )}
      <p className="flex items-center gap-2 text-xs text-neutral-dark/65">
        <span className="size-2 animate-pulse rounded-full bg-green-500 motion-reduce:animate-none" aria-hidden="true" />
        Live — new orders appear automatically
      </p>
    </>
  );
}
