import type { SiteSettings } from "@/lib/supabase/types";

// Display mirror of _award_loyalty_on_delivery() — the database is what
// actually credits points. floor(₦ paid / 1000) × rate, whole points.
export function pointsForAmount(
  amountPaid: number,
  settings: Pick<SiteSettings, "loyalty_enabled" | "loyalty_points_per_1000">,
) {
  if (!settings.loyalty_enabled) return 0;
  return Math.floor(Math.floor(amountPaid / 1000) * settings.loyalty_points_per_1000);
}

export const formatPoints = (points: number) =>
  `${points.toLocaleString("en-NG")} point${points === 1 ? "" : "s"}`;
