"use client";

import { useRef, useState } from "react";
import { CtaButton } from "@/components/ui/cta-button";
import { useCart } from "@/lib/cart/store";
import { formatNaira } from "@/lib/money";
import type { DishSize, MenuItem } from "@/lib/supabase/types";
import { QuantityStepper } from "./quantity-stepper";

type Dish = Pick<MenuItem, "id" | "name" | "image_url"> & { sizes: DishSize[] };

// Bowl-size choice for dishes sold in sizes (menu cards, hero). Native
// <dialog>: focus trap, Esc to close, backdrop tap closes. Adding opens the
// cart panel so the customer sees what went in.
export function SizePickerButton({
  dish,
  label = "Add to cart",
  size = "md",
}: {
  dish: Dish;
  label?: string;
  size?: "sm" | "md";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sizeId, setSizeId] = useState(dish.sizes[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);
  const chosen = dish.sizes.find((s) => s.id === sizeId) ?? dish.sizes[0];

  function addToCart() {
    if (!chosen) return;
    add(
      {
        menuItemId: dish.id,
        sizeId: chosen.id,
        sizeName: chosen.name,
        name: dish.name,
        unitPrice: chosen.price,
        imageUrl: dish.image_url,
      },
      qty,
    );
    dialogRef.current?.close();
    setQty(1);
    openCart();
  }

  return (
    <>
      <CtaButton size={size} onClick={() => dialogRef.current?.showModal()}>
        {label}
      </CtaButton>
      <dialog
        ref={dialogRef}
        aria-labelledby={`size-title-${dish.id}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-white p-0 text-neutral-dark shadow-2xl backdrop:bg-neutral-dark/50"
      >
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-secondary/80 uppercase">Choose a bowl size</p>
              <h2 id={`size-title-${dish.id}`} className="font-display text-2xl font-semibold text-secondary">
                {dish.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-xl text-secondary hover:bg-primary/40"
            >
              ×
            </button>
          </div>

          <SizeOptions name={`size-${dish.id}`} sizes={dish.sizes} value={chosen?.id ?? ""} onChange={setSizeId} />

          <div className="flex items-center justify-between gap-3">
            <QuantityStepper value={qty} onChange={setQty} min={1} label={dish.name} />
            {chosen && <span className="text-lg font-semibold text-secondary tabular-nums">{formatNaira(chosen.price * qty)}</span>}
          </div>

          <CtaButton size="lg" fullWidth onClick={addToCart}>
            Add to cart
          </CtaButton>
        </div>
      </dialog>
    </>
  );
}

// Size radio cards, shared by the picker and the dish page.
export function SizeOptions({
  name,
  sizes,
  value,
  onChange,
}: {
  name: string;
  sizes: DishSize[];
  value: string;
  onChange: (sizeId: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Bowl size</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sizes.map((size) => (
          <label
            key={size.id}
            className={`flex cursor-pointer flex-col rounded-2xl border-2 px-3 py-2.5 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-secondary ${
              value === size.id ? "border-secondary bg-primary/40" : "border-secondary/15 hover:border-secondary/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={size.id}
              checked={value === size.id}
              onChange={() => onChange(size.id)}
              className="sr-only"
            />
            <span className="text-sm font-semibold text-secondary">{size.name}</span>
            <span className="text-sm text-neutral-dark/75 tabular-nums">{formatNaira(size.price)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
