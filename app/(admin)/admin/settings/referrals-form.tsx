"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { saveReferrals } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function ReferralsForm({ amount }: { amount: number }) {
  const [state, action, pending] = useActionState(saveReferrals, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Referral bonus (₦)
        <input
          name="referral_bonus_amount"
          inputMode="decimal"
          required
          defaultValue={v ? v.referral_bonus_amount : String(amount)}
          className={`${inputClass} sm:max-w-48`}
        />
        {errors.referral_bonus_amount ? (
          <span className="text-xs font-normal text-red-700">{errors.referral_bonus_amount[0]}</span>
        ) : (
          <span className="text-xs font-normal text-neutral-dark/60">
            Credited to the referrer when their friend&apos;s first order is delivered. Spendable only at checkout.
            0 pauses rewards. Changes don&apos;t affect bonuses already earned.
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
