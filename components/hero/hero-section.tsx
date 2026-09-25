"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AddToCartControl } from "@/components/cart/add-to-cart-control";
import { PriceRow } from "@/components/menu/price-row";
import { formatNaira } from "@/lib/money";
import type { MenuItem, SiteSettings } from "@/lib/supabase/types";

// Flavor-swap hero (docs/hero-section-design.md), styled after the client's
// reference video: one large frosted card over a soft, blurred photo of the
// selected dish. The plated dish turns slowly; picking another dish rolls the
// old plate out to the right while the new one swings in from above, and the
// text + background crossfade. Auto-cycles every few seconds and keeps going
// through hover/taps (client); the arrows jump back/forth and restart the
// timer. Reduced motion → no auto-cycle, instant swaps, no spin.
const AUTO_CYCLE_MS = 5000;

export function HeroSection({
  items,
  settings,
}: {
  items: MenuItem[];
  settings: Pick<SiteSettings, "brand_name" | "logo_url">;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  // The plate on its way out, kept on screen until its roll-out finishes.
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  // Bumped on every switch so the incoming plate's animation restarts.
  const [swaps, setSwaps] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const active = items[activeIndex];

  // Next dish after a pause; re-armed on every change, so a manual pick gets
  // a full interval before the next automatic one.
  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      setLeavingIndex(activeIndex);
      setActiveIndex((activeIndex + 1) % items.length);
      setSwaps((n) => n + 1);
      setExpanded(false);
    }, AUTO_CYCLE_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, items.length]);

  function select(index: number) {
    if (index === activeIndex) return;
    setLeavingIndex(activeIndex);
    setActiveIndex(index);
    setSwaps((n) => n + 1);
    setExpanded(false);
  }

  return (
    <section aria-label="Featured dishes" className="relative isolate overflow-hidden bg-primary/40">
      {/* Background: every featured photo stacked; only the active one shows,
          so switching is a true crossfade. A light wash keeps it soft/pastel. */}
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
              className={`scale-110 object-cover blur-2xl transition-opacity duration-500 ${
                i === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null,
        )}
        <div className="absolute inset-0 bg-white/45" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10 md:py-14">
        {/* Glass card — a real white fill behind the text, not just blur, for AA
            contrast over busy food photos (§7). */}
        <div className="grid grid-cols-1 gap-6 rounded-[2rem] border border-white/60 bg-white/60 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-8 md:p-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col md:justify-center">
            <div className="text-secondary">
              {settings.logo_url ? (
                <Image
                  src={settings.logo_url}
                  alt={settings.brand_name}
                  width={120}
                  height={32}
                  className="h-7 w-auto object-contain"
                />
              ) : (
                <span className="text-sm font-semibold tracking-wide">{settings.brand_name}</span>
              )}
            </div>

            <div key={active.id} className="mt-4 flex animate-fade-in flex-col gap-3">
              <h1 className="font-display text-4xl leading-[1.05] font-semibold text-neutral-dark sm:text-5xl lg:text-6xl">
                {active.name}
              </h1>
              {active.description && (
                <div>
                  <p
                    className={`max-w-prose text-base text-neutral-dark/75 md:line-clamp-4 ${expanded ? "" : "line-clamp-2"}`}
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

            {items.length > 1 && (
              <div
                role="group"
                aria-label="Choose a featured dish"
                className="-mx-5 mt-8 flex items-center gap-4 overflow-x-auto px-5 py-3 sm:-mx-8 sm:px-8 md:mx-0 md:px-1"
              >
                <button
                  type="button"
                  onClick={() => select((activeIndex - 1 + items.length) % items.length)}
                  aria-label="Previous featured dish"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-secondary shadow-sm transition hover:bg-white"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 6-6 6 6 6" />
                  </svg>
                </button>
                {items.map((item, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => select(i)}
                      aria-pressed={isActive}
                      aria-label={`View ${item.name}, ${formatNaira(item.price)}`}
                      className={`relative size-12 shrink-0 overflow-hidden rounded-full bg-primary/40 transition duration-300 ${
                        isActive
                          ? "-translate-y-1 scale-110 shadow-md ring-[3px] ring-secondary"
                          : "opacity-80 ring-2 ring-neutral-dark/70 hover:-translate-y-0.5 hover:opacity-100"
                      }`}
                    >
                      {item.image_url && <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => select((activeIndex + 1) % items.length)}
                  aria-label="Next featured dish"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-secondary shadow-sm transition hover:bg-white"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Plated dish: above the text on phones, right column from md. The
              outer layer does the swap motion, the inner one the slow spin. */}
          <div className="relative order-first mx-auto aspect-square w-60 sm:w-72 md:order-none md:w-full md:self-center">
            {leavingIndex !== null && (
              <Plate
                item={items[leavingIndex]}
                className="animate-plate-out"
                onAnimationEnd={() => setLeavingIndex(null)}
              />
            )}
            <Plate
              key={`${active.id}-${swaps}`}
              item={active}
              priority={activeIndex === 0}
              className={swaps > 0 ? "animate-plate-in" : ""}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Plate({
  item,
  className,
  priority = false,
  onAnimationEnd,
}: {
  item: MenuItem;
  className: string;
  priority?: boolean;
  onAnimationEnd?: () => void;
}) {
  return (
    <div
      aria-hidden={onAnimationEnd ? true : undefined}
      onAnimationEnd={onAnimationEnd}
      className={`absolute inset-0 ${className}`}
    >
      <div className="size-full animate-plate-spin rounded-full border-[10px] border-neutral-dark bg-neutral-dark shadow-[0_30px_50px_-18px_rgba(0,0,0,0.6)]">
        {item.image_url ? (
          <div className="relative size-full overflow-hidden rounded-full">
            <Image
              src={item.image_url}
              alt={onAnimationEnd ? "" : item.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 24rem, (min-width: 768px) 20rem, 18rem"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="size-full rounded-full bg-primary/40" />
        )}
      </div>
    </div>
  );
}
