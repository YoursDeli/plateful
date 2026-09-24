"use client";

import { MAX_QUANTITY } from "@/lib/cart/store";

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  label,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  label: string;
  size?: "sm" | "md";
}) {
  const btn =
    size === "sm"
      ? "size-8 text-base"
      : "size-10 text-lg";
  return (
    <div
      role="group"
      aria-label={`Quantity for ${label}`}
      className="inline-flex items-center rounded-full border border-secondary/25 bg-white"
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={value - 1 === 0 ? `Remove ${label}` : `Decrease ${label}`}
        className={`${btn} flex items-center justify-center rounded-full font-semibold text-secondary hover:bg-primary/40 disabled:opacity-30`}
      >
        −
      </button>
      <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QUANTITY}
        aria-label={`Increase ${label}`}
        className={`${btn} flex items-center justify-center rounded-full font-semibold text-secondary hover:bg-primary/40 disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}
