import { NextResponse } from "next/server";
import { isValidWebhookSignature } from "@/lib/paystack";
import { settlePayment } from "@/lib/orders/settle";

// Paystack → us: the source of truth for payments
// (docs/cart-checkout-payment-workflow.md §4). Signature is checked on the raw
// body before anything is parsed. Logs event type + reference only — never
// the body (branding-security-auth.md §3).
export async function POST(request: Request) {
  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const reference = event.data?.reference;
  console.info("paystack webhook:", event.event, reference);

  if (event.event === "charge.success" && reference) {
    try {
      const result = await settlePayment(reference);
      console.info("paystack webhook settled:", reference, result.outcome);
    } catch (error) {
      // 500 → Paystack retries later, which is what we want for transient errors.
      console.error("paystack webhook settle failed:", reference, (error as Error).message);
      return NextResponse.json({ error: "settle failed" }, { status: 500 });
    }
  }

  // Acknowledge everything else so Paystack doesn't keep retrying.
  return NextResponse.json({ received: true });
}
