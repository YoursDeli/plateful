"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import type { Profile } from "@/lib/supabase/types";
import { saveProfile } from "./actions";

const input =
  "w-full rounded-xl border border-secondary/20 bg-white px-4 py-3 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  const card = "flex flex-col gap-4 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-7";
  const heading = "font-display text-2xl font-semibold text-secondary";

  return (
    <form action={action} className="flex flex-col gap-6">
      <section aria-labelledby="details-heading" className={card}>
        <h2 id="details-heading" className={heading}>Your details</h2>
        <Field label="Full name" error={errors.full_name}>
          <input
            name="full_name"
            required
            maxLength={120}
            autoComplete="name"
            defaultValue={v ? v.full_name : (profile.full_name ?? "")}
            className={input}
          />
        </Field>
        <Field label="Phone" hint="Used for delivery updates." error={errors.phone}>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            defaultValue={v ? v.phone : (profile.phone ?? "")}
            className={input}
          />
        </Field>
      </section>

      <section aria-labelledby="address-heading" className={card}>
        <div>
          <h2 id="address-heading" className={heading}>Delivery address</h2>
          <p className="mt-1 text-sm text-neutral-dark/65">
            Where we deliver by default — it&apos;s pre-filled at checkout, and you can still change it per order.
          </p>
        </div>
        <Field label="Address" error={errors.default_address}>
          <textarea
            name="default_address"
            rows={3}
            maxLength={500}
            autoComplete="street-address"
            placeholder="House number, street, area, landmark"
            defaultValue={v ? v.default_address : (profile.default_address ?? "")}
            className={input}
          />
        </Field>
      </section>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-btn bg-primary px-6 py-3 font-semibold text-secondary disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error ? (
        <span className="text-xs font-normal text-red-700">{error[0]}</span>
      ) : (
        hint && <span className="text-xs font-normal text-neutral-dark/65">{hint}</span>
      )}
    </label>
  );
}
