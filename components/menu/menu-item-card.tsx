import Image from "next/image";
import Link from "next/link";
import { AddToCartControl } from "@/components/cart/add-to-cart-control";
import type { MenuItem } from "@/lib/supabase/types";
import { PriceRow } from "./price-row";
import { RatingRow } from "./rating-row";

// docs/menu-and-product-page.md §1. Mobile: single-column horizontal card
// (photo left, details right) per CLAUDE.md §6's stacked-mobile rule;
// sm and up: classic vertical card in a multi-column grid.
export function MenuItemCard({
  item,
  categoryName,
  priority = false,
}: {
  item: MenuItem;
  categoryName?: string | null;
  priority?: boolean;
}) {
  const soldOut = !item.is_available;
  return (
    <article className="group relative flex h-full gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-secondary/5 transition hover:shadow-md sm:flex-col sm:gap-0 sm:p-0">
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-primary/30 sm:aspect-[4/3] sm:w-full sm:rounded-none">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 112px"
            className={`object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-3xl">🍽️</span>
        )}
        {item.badge && (
          <span className="absolute top-2 left-2 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary uppercase shadow">
            {item.badge}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:p-4">
        <h3 className="font-display text-lg leading-tight font-semibold text-neutral-dark">
          {/* Stretched link: the whole card opens the dish; the cart control sits above it (z-10). */}
          <Link href={`/menu/${item.id}`} className="after:absolute after:inset-0 hover:underline">
            {item.name}
          </Link>
        </h3>
        <RatingRow rating={item.avg_rating} count={item.review_count} />
        {item.description && (
          <p className="line-clamp-2 text-sm text-neutral-dark/65">{item.description}</p>
        )}
        {categoryName && (
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary/50 px-2.5 py-0.5 text-xs font-medium text-secondary">
              {categoryName}
            </span>
          </div>
        )}
        <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <PriceRow item={item} />
          <AddToCartControl item={item} size="sm" />
        </div>
      </div>
    </article>
  );
}
