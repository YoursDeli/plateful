import type { MenuItem } from "@/lib/supabase/types";

// Discount only shows when the admin set an original price above the price.
export function hasDiscount(item: Pick<MenuItem, "price" | "compare_at_price">) {
  return item.compare_at_price !== null && item.compare_at_price > item.price;
}

export function discountPercent(item: Pick<MenuItem, "price" | "compare_at_price">) {
  if (!hasDiscount(item)) return 0;
  return Math.round((1 - item.price / item.compare_at_price!) * 100);
}
