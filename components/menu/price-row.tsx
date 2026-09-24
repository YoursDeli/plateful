import { formatNaira } from "@/lib/money";
import { discountPercent, hasDiscount } from "@/lib/pricing";
import type { MenuItem } from "@/lib/supabase/types";

export function PriceRow({
  item,
  size = "md",
}: {
  item: Pick<MenuItem, "price" | "compare_at_price">;
  size?: "md" | "lg";
}) {
  const discounted = hasDiscount(item);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <strong className={`tabular-nums text-secondary ${size === "lg" ? "text-2xl" : "text-lg"}`}>
        {formatNaira(item.price)}
      </strong>
      {discounted && (
        <>
          <s className="text-sm text-neutral-dark/45 tabular-nums">
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
