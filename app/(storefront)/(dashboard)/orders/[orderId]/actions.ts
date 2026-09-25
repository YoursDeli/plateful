"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// Customer self-cancel. The 30-minute window, ownership and "still only
// Confirmed" rules are all enforced inside cancel_my_order() in the DB.
export async function cancelMyOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const orderId = z.uuid().safeParse(formData.get("order_id"));
  if (!orderId.success) return { error: "Unknown order." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId.data });
  if (error) {
    if (error.message.includes("cancel_window_closed")) {
      return { error: "The 30-minute cancellation window has passed, so this order can no longer be cancelled." };
    }
    if (error.message.includes("cancel_not_allowed")) {
      return { error: "The kitchen has already started on this order, so it can't be cancelled now." };
    }
    console.error("cancel_my_order failed:", orderId.data, error.message);
    return { error: "Couldn't cancel the order. Please try again or contact us." };
  }

  revalidatePath(`/orders/${orderId.data}`);
  revalidatePath("/account/orders");
  return { ok: true };
}
