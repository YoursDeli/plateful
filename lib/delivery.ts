import type { Fulfillment, SiteSettings } from "@/lib/supabase/types";

// Display-side mirror of create_order()'s fee rule — the database function is
// what actually charges; keep the two in sync.
export function deliveryFeeFor(
  subtotal: number,
  fulfillment: Fulfillment,
  settings: Pick<SiteSettings, "delivery_fee" | "free_delivery_threshold">,
) {
  if (fulfillment === "pickup") return 0;
  const threshold = settings.free_delivery_threshold;
  if (threshold !== null && subtotal >= threshold) return 0;
  return settings.delivery_fee;
}

// "Add ₦X more for free delivery" — null when not applicable.
export function amountToFreeDelivery(
  subtotal: number,
  settings: Pick<SiteSettings, "delivery_fee" | "free_delivery_threshold">,
) {
  const threshold = settings.free_delivery_threshold;
  if (threshold === null || settings.delivery_fee === 0 || subtotal >= threshold) return null;
  return threshold - subtotal;
}
