import type { Fulfillment, SiteSettings } from "@/lib/supabase/types";

type Threshold = Pick<SiteSettings, "free_delivery_threshold">;

// Display-side mirror of create_order()'s fee rule — the database function is
// what actually charges; keep the two in sync. `zoneFee` is the chosen
// delivery area's price (null until an area is picked).
export function deliveryFeeFor(
  subtotal: number,
  fulfillment: Fulfillment,
  zoneFee: number | null,
  settings: Threshold,
) {
  if (fulfillment === "pickup" || zoneFee === null) return 0;
  const threshold = settings.free_delivery_threshold;
  if (threshold !== null && subtotal >= threshold) return 0;
  return zoneFee;
}

// "Add ₦X more for free delivery" — null when not applicable.
export function amountToFreeDelivery(subtotal: number, settings: Threshold) {
  const threshold = settings.free_delivery_threshold;
  if (threshold === null || subtotal >= threshold) return null;
  return threshold - subtotal;
}
