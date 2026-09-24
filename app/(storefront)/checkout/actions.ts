"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { emptyToNull, formValues, type FormState } from "@/lib/form-state";
import { nairaToKobo } from "@/lib/money";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

export type CheckoutState = FormState & { code?: "items_unavailable" };

const itemsSchema = z
  .array(
    z.object({
      menu_item_id: z.uuid(),
      quantity: z.number().int().min(1).max(50),
    }),
  )
  .min(1, "Your cart is empty.")
  .max(100);

const checkoutSchema = z
  .object({
    fulfillment: z.enum(["delivery", "pickup"]),
    contact_name: z.string().trim().min(1, "Please enter your name").max(120),
    contact_phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{6,18}$/, "Enter a valid phone number, e.g. 0803 123 4567"),
    delivery_address: z.string().trim().max(500).nullable(),
    notes: z.string().trim().max(500, "Keep notes under 500 characters").nullable(),
    save_details: z.boolean(),
  })
  .refine((v) => v.fulfillment === "pickup" || (v.delivery_address?.length ?? 0) >= 5, {
    path: ["delivery_address"],
    message: "Please enter a delivery address",
  });

const FIELDS = ["fulfillment", "contact_name", "contact_phone", "delivery_address", "notes"] as const;

// Where Paystack should send the shopper back. Server actions always carry an
// Origin header (Next checks it against Host for CSRF), so this is our own
// origin — localhost, LAN IP, or the Netlify URL.
async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to check out." };
  if (!isPaystackConfigured()) {
    return { error: "Online payment isn't set up yet. Please try again later.", values: formValues(formData, FIELDS) };
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    rawItems = null;
  }
  const items = itemsSchema.safeParse(rawItems);
  if (!items.success) return { error: "Your cart looks empty — add a dish and try again." };

  const parsed = checkoutSchema.safeParse({
    fulfillment: formData.get("fulfillment"),
    contact_name: formData.get("contact_name") ?? "",
    contact_phone: formData.get("contact_phone") ?? "",
    delivery_address: emptyToNull(formData.get("delivery_address")),
    notes: emptyToNull(formData.get("notes")),
    save_details: formData.get("save_details") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: formValues(formData, FIELDS) };
  }
  const f = parsed.data;

  // Authoritative pricing happens inside create_order (one DB transaction):
  // live menu prices, availability check, delivery fee from site_settings.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_items: items.data,
    p_fulfillment: f.fulfillment,
    p_contact_name: f.contact_name,
    p_contact_phone: f.contact_phone,
    p_delivery_address: f.fulfillment === "delivery" ? f.delivery_address : null,
    p_notes: f.notes,
  });
  if (error || !data?.[0]) {
    if (error?.message.includes("items_unavailable")) {
      return {
        code: "items_unavailable",
        error: "Some dishes in your cart just sold out or changed. We've refreshed your cart — please review it.",
        values: formValues(formData, FIELDS),
      };
    }
    console.error("create_order failed:", error?.code, error?.message);
    return { error: "Couldn't place your order. Please try again.", values: formValues(formData, FIELDS) };
  }
  const order = data[0];

  if (f.save_details) {
    // Best-effort; column grant limits this to the user's own safe fields.
    await supabase
      .from("profiles")
      .update({
        full_name: f.contact_name,
        phone: f.contact_phone,
        ...(f.fulfillment === "delivery" ? { default_address: f.delivery_address } : {}),
      })
      .eq("id", user.id);
  }

  let authorizationUrl: string;
  try {
    const tx = await initializeTransaction({
      email: order.contact_email,
      amountKobo: nairaToKobo(order.total),
      reference: order.paystack_reference,
      callbackUrl: `${await siteOrigin()}/checkout/verify`,
      metadata: { order_id: order.order_id, order_number: order.order_number },
    });
    authorizationUrl = tx.authorization_url;
  } catch (e) {
    console.error("paystack initialize failed:", order.paystack_reference, (e as Error).message);
    // The order exists (pending) — send them to its page to retry payment.
    redirect(`/checkout/verify?reference=${encodeURIComponent(order.paystack_reference)}&init=failed`);
  }

  redirect(authorizationUrl);
}

// "Try payment again" for an unpaid order: fresh single-use reference, new
// Paystack session for the same (already server-priced) total.
export async function retryPayment(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cart");
  const orderId = z.uuid().parse(formData.get("order_id"));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("renew_payment_reference", { p_order_id: orderId });
  const row = data?.[0];
  if (error || !row) redirect("/cart"); // not theirs, or no longer pending

  let authorizationUrl: string;
  try {
    const tx = await initializeTransaction({
      email: row.contact_email,
      amountKobo: nairaToKobo(row.total),
      reference: row.paystack_reference,
      callbackUrl: `${await siteOrigin()}/checkout/verify`,
      metadata: { order_id: orderId },
    });
    authorizationUrl = tx.authorization_url;
  } catch (e) {
    console.error("paystack re-initialize failed:", row.paystack_reference, (e as Error).message);
    redirect(`/checkout/verify?reference=${encodeURIComponent(row.paystack_reference)}&init=failed`);
  }
  redirect(authorizationUrl);
}
