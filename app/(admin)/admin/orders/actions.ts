"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  order_id: z.uuid(),
  status: z.enum(["preparing", "ready", "out_for_delivery", "delivered", "cancelled"]),
});

// Staff-triggered transitions (cart-checkout-payment-workflow.md §6). The
// transition rules + staff check are enforced again inside set_order_status().
export async function updateOrderStatus(formData: FormData) {
  await requireStaff("/admin/orders");
  const parsed = schema.parse({ order_id: formData.get("order_id"), status: formData.get("status") });

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: parsed.order_id,
    p_status: parsed.status,
  });
  if (error) {
    console.error("set_order_status failed:", parsed.order_id, error.message);
    throw new Error(
      error.message.includes("invalid_transition")
        ? "That order has already moved on — refresh to see its latest status."
        : "Couldn't update the order.",
    );
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${parsed.order_id}`);
}

// Staff confirm they've issued the refund in the Paystack dashboard.
export async function markRefunded(formData: FormData) {
  await requireStaff("/admin/orders");
  const orderId = z.uuid().parse(formData.get("order_id"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_order_refunded", { p_order_id: orderId });
  if (error) {
    console.error("mark_order_refunded failed:", orderId, error.message);
    throw new Error("Couldn't mark the order refunded.");
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
}
