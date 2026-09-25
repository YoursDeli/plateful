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

  return (
    <form action={action} className="flex flex-col gap-4">
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
      <Field label="Default delivery address" hint="We'll pre-fill this at checkout." error={errors.default_address}>
        <textarea
          name="default_address"
          rows={3}
          maxLength={500}
          autoComplete="street-address"
          defaultValue={v ? v.default_address : (profile.default_address ?? "")}
          className={input}
        />
      </Field>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-btn bg-primary px-6 py-3 font-semibold text-secondary disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save details"}
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
        hint && <span className="text-xs font-normal text-neutral-dark/55">{hint}</span>
      )}
    </label>
  );
}
