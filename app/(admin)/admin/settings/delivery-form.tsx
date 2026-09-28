"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import type { SiteSettings } from "@/lib/supabase/types";
import { saveDelivery } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function DeliveryForm({
  settings,
}: {
  settings: Pick<SiteSettings, "free_delivery_threshold">;
}) {
  const [state, action, pending] = useActionState(saveDelivery, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium sm:max-w-xs">
        Free delivery from (₦)
        <input
          name="free_delivery_threshold"
          inputMode="decimal"
          placeholder="No threshold"
          defaultValue={v ? v.free_delivery_threshold : (settings.free_delivery_threshold?.toString() ?? "")}
          className={inputClass}
        />
        {errors.free_delivery_threshold ? (
          <span className="text-xs font-normal text-red-700">{errors.free_delivery_threshold[0]}</span>
        ) : (
          <span className="text-xs font-normal text-neutral-dark/65">
            Orders at or above this subtotal deliver free, in every area. Leave blank to always charge the area price.
          </span>
        )}
      </label>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}

      <div className="flex sm:justify-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-btn bg-primary px-5 py-2.5 text-sm font-medium text-secondary disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
