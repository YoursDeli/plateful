"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AddToCartControl } from "@/components/cart/add-to-cart-control";
import { PriceRow } from "@/components/menu/price-row";
import { formatNaira } from "@/lib/money";
import type { MenuItem } from "@/lib/supabase/types";

// Flavor-swap hero (docs/hero-section-design.md), styled after the client's
// reference video: one large frosted card over a soft, blurred photo of the
// selected dish. The plated dish turns slowly; picking another dish rolls the
// old plate out to the right while the new one swings in from above, and the
// text + background crossfade. Auto-cycles every few seconds and keeps going
// through hover/taps (client); the arrows jump back/forth and restart the
// timer. Reduced motion → no auto-cycle, instant swaps, no spin.
const AUTO_CYCLE_MS = 5000;

export function HeroSection({ items }: { items: MenuItem[] }) {
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
              className={`scale-110 object-cover blur-2xl transition-opacity duration-500 will-change-[opacity] ${
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
        <div className="grid grid-cols-1 gap-6 rounded-[2rem] border border-white/60 bg-white/65 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] sm:p-8 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-8 md:p-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col md:justify-center">
            <div key={active.id} className="flex animate-fade-in flex-col gap-3">
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

          {/* Plated dish: above the text on phones, right column from md. Every
              plate stays mounted so its photo is already loaded when it swings
              in; only the active and leaving plates are visible. */}
          <div className="relative order-first mx-auto aspect-square w-60 sm:w-72 md:order-none md:w-full md:self-center">
            {items.map((item, i) => {
              const state = i === activeIndex ? "in" : i === leavingIndex ? "out" : "hidden";
              return (
                <Plate
                  key={item.id}
                  item={item}
                  state={state}
                  animateIn={swaps > 0}
                  priority={i === 0}
                  onLeft={() => setLeavingIndex((current) => (current === i ? null : current))}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Plate({
  item,
  state,
  animateIn,
  priority,
  onLeft,
}: {
  item: MenuItem;
  state: "in" | "out" | "hidden";
  animateIn: boolean;
  priority: boolean;
  onLeft: () => void;
}) {
  const motion = state === "out" ? "animate-plate-out" : state === "in" && animateIn ? "animate-plate-in" : "";
  return (
    <div
      aria-hidden={state !== "in"}
      // Only this layer's own roll-out counts (the inner spin never ends).
      onAnimationEnd={(e) => {
        if (state === "out" && e.target === e.currentTarget) onLeft();
      }}
      className={`absolute inset-0 will-change-transform ${motion} ${state === "hidden" ? "invisible" : ""} ${
        state === "in" ? "z-10" : ""
      }`}
    >
      <div
        className={`size-full rounded-full border-[10px] border-neutral-dark bg-neutral-dark shadow-[0_30px_50px_-18px_rgba(0,0,0,0.6)] will-change-transform ${
          state === "hidden" ? "" : "animate-plate-spin"
        }`}
      >
        {item.image_url ? (
          <div className="relative size-full overflow-hidden rounded-full">
            <Image
              src={item.image_url}
              alt={state === "in" ? item.name : ""}
              fill
              priority={priority}
              loading={priority ? undefined : "eager"}
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
