import { formatNaira } from "@/lib/money";
import { discountPercent, hasDiscount } from "@/lib/pricing";
import type { DishSize, MenuItem } from "@/lib/supabase/types";

// Dishes sold in bowl sizes show "From ₦<smallest size price>"; the
// compare-at discount only applies to single-price dishes.
export function PriceRow({
  item,
  size = "md",
}: {
  item: Pick<MenuItem, "price" | "compare_at_price"> & { sizes?: DishSize[] };
  size?: "md" | "lg";
}) {
  const text = `tabular-nums text-secondary ${size === "lg" ? "text-2xl" : "text-lg"}`;
  if (item.sizes && item.sizes.length > 0) {
    const from = Math.min(...item.sizes.map((s) => s.price));
    return (
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        {item.sizes.length > 1 && <span className="text-sm text-neutral-dark/70">From</span>}
        <strong className={text}>{formatNaira(from)}</strong>
      </p>
    );
  }

  const discounted = hasDiscount(item);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <strong className={text}>{formatNaira(item.price)}</strong>
      {discounted && (
        <>
          <s className="text-sm text-neutral-dark/60 tabular-nums">
            <span className="sr-only">Was </span>
            {formatNaira(item.compare_at_price!)}
          </s>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
            {discountPercent(item)}% off
          </span>
        </>
      )}
    </p>
  );
}
