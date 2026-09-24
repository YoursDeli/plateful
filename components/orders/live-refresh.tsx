"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Re-renders the (server) page whenever the watched order row(s) change —
// Supabase Realtime, which respects RLS (customers only hear about their own
// orders; staff about all). `onEvent` lets the admin board react to new orders.
export function OrderLiveRefresh({
  orderId,
  channel,
  onEvent,
}: {
  orderId?: string; // omit to watch every order visible to this user (admin board)
  channel: string;
  onEvent?: (
    row: { id: string; status: string; order_code: string; cancelled_by?: string | null },
    type: string,
  ) => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const sub = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          ...(orderId ? { filter: `id=eq.${orderId}` } : {}),
        },
        (payload) => {
          const row = payload.new as { id: string; status: string; order_code: string; cancelled_by?: string | null };
          onEvent?.(row, payload.eventType);
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(sub);
    };
  }, [channel, orderId, onEvent, router]);

  return null;
}
