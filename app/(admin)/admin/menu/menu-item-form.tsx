"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { initialFormState } from "@/lib/form-state";
import type { Category, MenuItem } from "@/lib/supabase/types";
import { saveMenuItem } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function MenuItemForm({
  item,
  categories,
}: {
  item?: MenuItem;
  categories: Category[];
}) {
  const [state, action, pending] = useActionState(saveMenuItem, initialFormState);
  const errors = state.fieldErrors ?? {};
  // After a failed submit, re-seed defaults from what was actually submitted.
  const v = state.values;
  const initial = (key: string, fallback: string | number | null | undefined) =>
    v ? v[key] : (fallback ?? "");

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white p-4 shadow-sm sm:p-6">
      {item && <input type="hidden" name="id" value={item.id} />}

      <Field label="Name" error={errors.name}>
        <input name="name" required maxLength={120} defaultValue={initial("name", item?.name)} className={inputClass} />
      </Field>

      <Field label="Description" error={errors.description} hint="Shown on the menu card (truncated to ~2 lines).">
        <textarea
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={initial("description", item?.description)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Price (₦)" error={errors.price}>
          <input
            name="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            defaultValue={initial("price", item?.price)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Original price (₦)"
          error={errors.compare_at_price}
          hint="Optional. Set higher than the price to show a discount."
        >
          <input
            name="compare_at_price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={initial("compare_at_price", item?.compare_at_price)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Category" error={errors.category_id}>
          <select name="category_id" defaultValue={initial("category_id", item?.category_id)} className={inputClass}>
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Badge" error={errors.badge}>
          <select name="badge" defaultValue={initial("badge", item?.badge)} className={inputClass}>
            <option value="">None</option>
            <option value="New">New</option>
            <option value="Bestseller">Bestseller</option>
          </select>
        </Field>
      </div>

      <ImageUploadField
        name="image_url"
        folder="menu-items"
        label="Photo"
        defaultValue={v ? v.image_url : item?.image_url}
      />
      {errors.image_url && <p className="text-sm text-red-700">{errors.image_url[0]}</p>}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="is_available"
          defaultChecked={v ? v.is_available === "on" : (item?.is_available ?? true)}
          className="size-4 accent-secondary"
        />
        Available to order
      </label>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/admin/menu"
          className="rounded-full border border-secondary px-5 py-2.5 text-center text-sm font-medium text-secondary"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-secondary disabled:opacity-60"
        >
          {pending ? "Saving…" : item ? "Save changes" : "Add item"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && !error && <span className="text-xs font-normal text-neutral-dark/60">{hint}</span>}
      {error && <span className="text-xs font-normal text-red-700">{error[0]}</span>}
    </label>
  );
}
