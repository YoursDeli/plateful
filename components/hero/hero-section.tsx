"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AddToCartControl } from "@/components/cart/add-to-cart-control";
import { PriceRow } from "@/components/menu/price-row";
import { formatNaira } from "@/lib/money";
import type { MenuItem } from "@/lib/supabase/types";

// Flavor-swap hero (docs/hero-section-design.md §8), after the client's
// reference video: one large frosted card over a soft, blurred photo of the
// current dish. All featured dishes sit on one big "orbit" wheel whose centre
// is off to the right; the dish area is a window onto it, so only one plate
// shows. Each step turns the whole wheel one position — the current plate
// curves away down-right as the next comes down from above — then it rests.
// Only that one wheel animates, which is what keeps it smooth on phones.
// Auto-cycles and keeps going through hover/taps (client); arrows and
// thumbnails turn the wheel too. Reduced motion → no auto-cycle, instant.
const AUTO_CYCLE_MS = 3000;
const TURN_MS = 1100;

export function HeroSection({ items }: { items: MenuItem[] }) {
  const count = items.length;
  // Total steps turned so far — never wraps, so the wheel always keeps
  // turning the same way instead of unwinding back to the start.
  const [turn, setTurn] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const activeIndex = ((turn % count) + count) % count;
  const active = items[activeIndex];

  const step = 360 / count;
  // Orbit radius in plate widths: big enough that neighbouring plates are
  // always outside the window.
  const radius = count <= 2 ? 1.6 : Math.max(1.6, 1.6 / Math.sin((step * Math.PI) / 180));

  // Rest, then turn one step; re-armed after every turn, so a manual pick
  // also gets a full rest before the next automatic one.
  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      setTurn((t) => t + 1);
      setExpanded(false);
    }, AUTO_CYCLE_MS + TURN_MS);
    return () => clearTimeout(timer);
  }, [turn, count]);

  function turnBy(steps: number) {
    if (steps === 0) return;
    setTurn((t) => t + steps);
    setExpanded(false);
  }

  // Thumbnails: the shortest way round the wheel.
  function goTo(index: number) {
    let steps = (((index - activeIndex) % count) + count) % count;
    if (steps > count / 2) steps -= count;
    turnBy(steps);
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
              className={`scale-110 object-cover blur-2xl transition-opacity duration-700 will-change-[opacity] ${
                i === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null,
        )}
        <div className="absolute inset-0 bg-white/45" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10 md:py-14">
        {/* Card — a real white fill behind the text for AA contrast over busy
            food photos (§7). No backdrop blur: the photo is already blurred. */}
        <div className="grid grid-cols-1 gap-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/65 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] sm:p-8 md:grid-cols-[minmax(0,1fr)_22rem] md:gap-8 md:p-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
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

            {count > 1 && (
              <div
                role="group"
                aria-label="Choose a featured dish"
                className="-mx-5 mt-8 flex items-center gap-4 overflow-x-auto px-5 py-3 sm:-mx-8 sm:px-8 md:mx-0 md:px-1"
              >
                <ArrowButton label="Previous featured dish" path="m15 6-6 6 6 6" onClick={() => turnBy(-1)} />
                {items.map((item, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(i)}
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
                <ArrowButton label="Next featured dish" path="m9 6 6 6-6 6" onClick={() => turnBy(1)} />
              </div>
            )}
          </div>

          {/* The window onto the orbit: full card width above the text on
              phones, the card's right side from md. Stretches to the card's
              edges so plates slide out through the card border. */}
          <div
            className="relative order-first -mx-5 -mt-5 h-[calc(var(--plate)+2.5rem)] overflow-hidden [--plate:15rem] sm:-mx-8 sm:-mt-8 sm:[--plate:18rem] md:order-none md:-my-10 md:mr-[-2.5rem] md:ml-0 md:h-auto md:min-h-[calc(var(--plate)+5rem)] md:[--plate:20rem] lg:[--plate:24rem]"
            style={{ "--orbit-r": `calc(var(--plate) * ${radius.toFixed(3)})` } as React.CSSProperties}
          >
            {/* The wheel: a zero-size point at the orbit centre, off to the
                right of the window. Turning it is the only animation. */}
            <div
              className="absolute top-1/2 size-0 will-change-transform"
              style={{
                left: "calc(50% + var(--orbit-r))",
                transform: `rotate(${-turn * step}deg)`,
                transition: `transform ${TURN_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
              }}
            >
              {items.map((item, i) => (
                <div
                  key={item.id}
                  aria-hidden={i !== activeIndex}
                  className="absolute"
                  style={{
                    width: "var(--plate)",
                    height: "var(--plate)",
                    left: "calc(var(--plate) / -2)",
                    top: "calc(var(--plate) / -2)",
                    transform: `rotate(${i * step}deg) translateX(calc(var(--orbit-r) * -1))`,
                  }}
                >
                  <Plate item={item} alt={i === activeIndex ? item.name : ""} priority={i === 0} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Shadow on the outer layer, slow idle spin on the inner one, so the shadow
// stays underneath instead of circling round with the spin.
function Plate({ item, alt, priority }: { item: MenuItem; alt: string; priority: boolean }) {
  return (
    <div className="size-full rounded-full shadow-[0_30px_50px_-18px_rgba(0,0,0,0.6)]">
      <div className="size-full animate-plate-spin rounded-full border-[10px] border-neutral-dark bg-neutral-dark will-change-transform">
        {item.image_url ? (
          <div className="relative size-full overflow-hidden rounded-full">
            <Image
              src={item.image_url}
              alt={alt}
              fill
              priority={priority}
              loading={priority ? undefined : "eager"}
              sizes="(min-width: 1024px) 24rem, (min-width: 768px) 20rem, (min-width: 640px) 18rem, 15rem"
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

function ArrowButton({ label, path, onClick }: { label: string; path: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-secondary shadow-sm transition hover:bg-white"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </button>
  );
}
