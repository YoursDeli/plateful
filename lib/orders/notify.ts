import "server-only";
import { isBrevoConfigured, sendTemplateEmail, templateId } from "@/lib/brevo";
import { pointsForAmount } from "@/lib/loyalty";
import { formatNaira } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

// Sends the customer receipt + the restaurant's "new order" alert for an
// order that has JUST become paid (called once, when mark_order_paid reports
// newly_paid). Runs after the response via after(); every failure is caught
// and logged — email must never break or slow checkout (§5). Logs ids only.
export async function notifyOrderPaid(orderId: string, siteUrl: string) {
  if (!isBrevoConfigured()) {
    console.warn("order emails skipped: BREVO_API_KEY not set", orderId);
    return;
  }
  const admin = createAdminClient();

  const [{ data: order }, { data: items }, { data: settings }] = await Promise.all([
    admin.from("orders").select("*").eq("id", orderId).single(),
    admin.from("order_items").select("*").eq("order_id", orderId),
    admin.from("site_settings").select("*").eq("id", 1).single(),
  ]);
  if (!order || !items || !settings) {
    console.error("order emails: couldn't load order", orderId);
    return;
  }

  const isPickup = order.fulfillment === "pickup";
  // Shared template params. Money is pre-formatted: templates can't format ₦.
  const params = {
    brand_name: settings.brand_name,
    // Brevo templates use {{ params.order_number }} — it carries the
    // customer-facing code (e.g. K7Q2M), so templates need no change.
    order_number: order.order_code,
    customer_name: order.contact_name,
    customer_first_name: order.contact_name.split(" ")[0],
    customer_phone: order.contact_phone,
    customer_email: order.contact_email,
    fulfillment: isPickup ? "Pickup" : "Delivery",
    is_pickup: isPickup,
    delivery_address: order.delivery_address ?? "",
    notes: order.notes ?? "",
    items: items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      line_total: formatNaira(i.line_total),
    })),
    subtotal: formatNaira(order.subtotal),
    delivery_fee: order.delivery_fee === 0 ? "Free" : formatNaira(order.delivery_fee),
    total: formatNaira(order.total),
    paid_at: new Date(order.paid_at ?? Date.now()).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }),
    // Points are credited on delivery (step 10) — the receipt says how many
    // are coming. 0 hides the block (program off / tiny order).
    points_earned: pointsForAmount(order.total, settings),
    order_url: `${siteUrl}/orders/${order.id}`,
    admin_url: `${siteUrl}/admin/orders`,
    site_url: siteUrl,
  };

  const confirmationTemplate = templateId("ORDER_CONFIRMATION");
  if (confirmationTemplate) {
    try {
      await sendTemplateEmail({
        to: { email: order.contact_email, name: order.contact_name },
        templateId: confirmationTemplate,
        params,
        tags: ["order-confirmation"],
      });
      await admin.from("orders").update({ confirmation_emailed_at: new Date().toISOString() }).eq("id", orderId);
    } catch (e) {
      console.error("order confirmation email failed:", order.order_code, (e as Error).message);
    }
  } else {
    console.warn("order confirmation skipped: BREVO_TEMPLATE_ORDER_CONFIRMATION not set");
  }

  const vendorTemplate = templateId("NEW_ORDER");
  const vendorEmail = settings.order_notification_email ?? process.env.BREVO_SENDER_EMAIL;
  if (vendorTemplate && vendorEmail) {
    try {
      await sendTemplateEmail({
        to: { email: vendorEmail, name: settings.brand_name },
        templateId: vendorTemplate,
        params,
        tags: ["new-order-alert"],
      });
      await admin.from("orders").update({ vendor_emailed_at: new Date().toISOString() }).eq("id", orderId);
    } catch (e) {
      console.error("new-order alert email failed:", order.order_code, (e as Error).message);
    }
  } else {
    console.warn("new-order alert skipped: template id or recipient not set");
  }
}
