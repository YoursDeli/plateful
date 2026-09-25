"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { saveLoyalty } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function LoyaltyForm({ enabled, rate }: { enabled: boolean; rate: number }) {
  const [state, action, pending] = useActionState(saveLoyalty, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="loyalty_enabled"
          defaultChecked={v ? v.loyalty_enabled === "on" : enabled}
          className="mt-0.5 size-5 accent-secondary"
        />
        <span>
          <span className="block font-medium">Loyalty program on</span>
          <span className="text-xs text-neutral-dark/60">
            When off, customers stop earning and can&apos;t spend points at checkout — but everyone keeps their
            balance, so switching it back on loses nothing.
          </span>
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Points per ₦1,000 spent
        <input
          name="loyalty_points_per_1000"
          inputMode="decimal"
          required
          defaultValue={v ? v.loyalty_points_per_1000 : String(rate)}
          className={`${inputClass} sm:max-w-48`}
        />
        {errors.loyalty_points_per_1000 ? (
          <span className="text-xs font-normal text-red-700">{errors.loyalty_points_per_1000[0]}</span>
        ) : (
          <span className="text-xs font-normal text-neutral-dark/60">
            1 point = ₦1 off at checkout. Points are credited when an order is delivered, on the amount actually paid.
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
