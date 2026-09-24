import "server-only";
import { after } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOrderPaid } from "./notify";

export type SettleResult =
  | { outcome: "paid"; orderId: string; newlyPaid: boolean }
  | { outcome: "not_paid"; paystackStatus: string }
  | { outcome: "unknown_order" };

// Single "is this order paid?" path shared by the webhook and the return-URL
// check (docs/cart-checkout-payment-workflow.md §4). Never trusts the browser
// or the webhook body: it asks Paystack directly, then marks the order paid
// through the idempotent, service-role-only mark_order_paid().
// `siteUrl` is this deployment's origin, for absolute links in the emails.
export async function settlePayment(reference: string, siteUrl: string): Promise<SettleResult> {
  const tx = await verifyTransaction(reference);

  if (tx.status !== "success" || tx.currency !== "NGN") {
    return { outcome: "not_paid", paystackStatus: tx.status };
  }

  const { data, error } = await createAdminClient().rpc("mark_order_paid", {
    p_reference: tx.reference,
    p_amount_kobo: tx.amount,
  });
  if (error) {
    // amount_mismatch lands here — never mark such an order paid.
    console.error("mark_order_paid failed:", tx.reference, error.message);
    throw new Error("Couldn't record the payment.");
  }

  const row = data[0];
  if (!row) return { outcome: "unknown_order" };

  // Emails only on the call that actually flipped the order to paid, so a
  // webhook + return-URL race can't send them twice. after() runs them once
  // the response is sent — email never delays or breaks the checkout.
  if (row.newly_paid) {
    after(() => notifyOrderPaid(row.order_id, siteUrl));
  }
  return { outcome: "paid", orderId: row.order_id, newlyPaid: row.newly_paid };
}
