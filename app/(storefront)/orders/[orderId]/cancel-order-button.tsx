"use client";

import { useActionState, useEffect, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { cancelMyOrder } from "./actions";

// Quiet "Cancel order" button, present only while the customer may cancel
// (within 30 min of payment, still "Confirmed"). Deliberately no countdown or
// deadline text — we don't want to rush or nudge customers; the policy lives
// in the Terms. A single hidden timer removes the button when the window
// closes; cancel_my_order() enforces the rule regardless.
export function CancelOrderButton({ orderId, deadline }: { orderId: string; deadline: string }) {
  const [state, action, pending] = useActionState(cancelMyOrder, initialFormState);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setOpen(false), Math.max(0, new Date(deadline).getTime() - Date.now()));
    return () => clearTimeout(id);
  }, [deadline]);

  if (!open && !state.error) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      {open && (
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm("Cancel this order? You'll get a full refund to your original payment method.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="order_id" value={orderId} />
          <button
            type="submit"
            disabled={pending}
            className="text-sm text-neutral-dark/60 underline-offset-4 hover:text-red-700 hover:underline disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Cancel order"}
          </button>
        </form>
      )}
      {state.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
    </div>
  );
}
