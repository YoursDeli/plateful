"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AddToCartControl } from "@/components/cart/add-to-cart-control";
import { PriceRow } from "@/components/menu/price-row";
import { formatNaira } from "@/lib/money";
import type { MenuItem, SiteSettings } from "@/lib/supabase/types";

// Flavor-swap hero (docs/hero-section-design.md): a frosted-glass card over a
// blurred, tinted photo of the selected dish. Picking another dish crossfades
// the background, re-animates the card text and swaps the plated dish image.
// No auto-rotate (off by default per §2). Reduced motion → instant swaps
// (global rule in globals.css).
export function HeroSection({
  items,
  settings,
}: {
  items: MenuItem[];
  settings: Pick<SiteSettings, "brand_name" | "logo_url">;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const active = items[activeIndex];

  function select(index: number) {
    setActiveIndex(index);
    setExpanded(false);
  }

  return (
    <section aria-label="Featured dishes" className="relative isolate overflow-hidden bg-secondary">
      {/* Background: every featured photo stacked; only the active one is visible,
          so switching is a true crossfade rather than a cut. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {items.map((item, i) =>
          item.image_url ? (
            <Image
              key={item.id}
              src={item.image_url}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className={`scale-110 object-cover blur-2xl transition-opacity duration-700 ${
                i === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null,
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/85 via-secondary/60 to-secondary/30" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pt-10 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:gap-0 md:pt-20 md:pb-12">
        {/* Glass card — real fill behind the text, not just blur, for AA contrast
            over busy food photos (§7). */}
        <div className="relative z-10 rounded-3xl border border-white/40 bg-white/80 p-6 shadow-2xl backdrop-blur-md sm:p-8 md:mr-[-4rem] md:pr-24">
          <div className="text-secondary">
            <span className="text-sm font-semibold tracking-wide">{settings.brand_name}</span>
          </div>

          <div key={active.id} aria-live="polite" className="mt-3 flex animate-fade-in flex-col gap-3">
            <h1 className="font-display text-4xl leading-[1.05] font-semibold text-secondary sm:text-5xl">
              {active.name}
            </h1>
            {active.description && (
              <div>
                <p
                  className={`text-base text-neutral-dark/75 md:line-clamp-none ${expanded ? "" : "line-clamp-1"}`}
                >
                  {active.description}
                </p>
                {!expanded && (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="text-sm font-medium text-secondary underline md:hidden"
                  >
                    more
                  </button>
                )}
              </div>
            )}
            <PriceRow item={active} size="lg" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AddToCartControl item={active} label="Order now" />
            <Link
              href={`/menu/${active.id}`}
              className="rounded-btn px-4 py-2.5 text-sm font-medium text-secondary underline-offset-4 hover:underline"
            >
              View details
            </Link>
          </div>
        </div>

        {/* Plated dish — overlaps the card's right edge on md+, stacks below on mobile. */}
        <div className="relative z-20 mx-auto aspect-square w-64 sm:w-80 md:w-full md:max-w-[26rem]">
          {active.image_url ? (
            <Image
              key={active.id}
              src={active.image_url}
              alt={active.name}
              fill
              priority={activeIndex === 0}
              sizes="(min-width: 768px) 26rem, 20rem"
              className="animate-rise-in rounded-full object-cover shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)] ring-8 ring-white/25"
            />
          ) : (
            <div aria-hidden="true" className="size-full rounded-full bg-primary/40 ring-8 ring-white/25" />
          )}
        </div>
      </div>

      {items.length > 1 && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 md:pb-12">
          <div role="group" aria-label="Choose a featured dish" className="-mx-4 flex items-center gap-3 overflow-x-auto px-4 py-2">
            {items.map((item, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(i)}
                  aria-pressed={isActive}
                  aria-label={`View ${item.name}, ${formatNaira(item.price)}`}
                  className={`flex shrink-0 items-center gap-2 rounded-full transition ${
                    isActive
                      ? "bg-white/90 py-1 pr-4 pl-1 shadow-lg"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <span
                    className={`relative size-14 overflow-hidden rounded-full bg-primary/40 ${
                      isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : "ring-2 ring-white/40"
                    }`}
                  >
                    {item.image_url && (
                      <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </span>
                  {isActive && (
                    <span className="flex flex-col items-start text-left leading-tight">
                      <span className="max-w-40 truncate text-sm font-semibold text-secondary">{item.name}</span>
                      <span className="text-xs text-neutral-dark/70 tabular-nums">{formatNaira(item.price)}</span>
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => select((activeIndex + 1) % items.length)}
              aria-label="Next featured dish"
              className="ml-1 flex size-12 shrink-0 items-center justify-center rounded-full border border-white/40 text-xl text-white hover:bg-white/15"
            >
              →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
