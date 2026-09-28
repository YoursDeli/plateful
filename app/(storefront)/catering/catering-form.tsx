"use client";

import { useActionState } from "react";
import { CtaButton } from "@/components/ui/cta-button";
import { initialFormState } from "@/lib/form-state";
import { EVENT_TYPES, FOOD_TYPES } from "@/lib/supabase/types";
import { requestQuote } from "./actions";

const input =
  "w-full rounded-xl border border-secondary/20 bg-white px-4 py-3 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary";

export function CateringForm({
  name,
  phone,
  email,
  minDate,
}: {
  name: string;
  phone: string;
  email: string | null;
  minDate: string; // yyyy-mm-dd, today in Lagos
}) {
  const [state, action, pending] = useActionState(requestQuote, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const chosenFood = new Set((v?.food_types ?? "").split("|").filter(Boolean));

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-7">
        <h2 className="font-display text-2xl font-semibold text-secondary">Your event</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type of event" error={errors.event_type}>
            <select name="event_type" required defaultValue={v?.event_type ?? ""} className={input}>
              <option value="" disabled>
                Choose one
              </option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date of event" error={errors.event_date}>
            <input name="event_date" type="date" required min={minDate} defaultValue={v?.event_date ?? ""} className={input} />
          </Field>
          <Field label="Number of guests" error={errors.guest_count}>
            <input
              name="guest_count"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={10000}
              placeholder="e.g. 150"
              defaultValue={v?.guest_count ?? ""}
              className={input}
            />
          </Field>
          <Field label="Venue or area (optional)" error={errors.venue}>
            <input name="venue" maxLength={300} placeholder="e.g. Effurun, Warri" defaultValue={v?.venue ?? ""} className={input} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Type of food (choose any)</legend>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map((food) => (
              <label
                key={food}
                className="flex cursor-pointer items-center gap-2 rounded-btn border border-secondary/20 bg-white px-3 py-2 text-sm has-checked:border-secondary has-checked:bg-primary/40 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-secondary"
              >
                <input
                  type="checkbox"
                  name="food_types"
                  value={food}
                  defaultChecked={chosenFood.has(food)}
                  className="size-4 accent-secondary"
                />
                {food}
              </label>
            ))}
          </div>
          {errors.food_types && <span className="text-xs text-red-700">{errors.food_types[0]}</span>}
        </fieldset>

        <Field label="Estimated budget (optional)" error={errors.budget}>
          <input name="budget" maxLength={120} placeholder="e.g. ₦500,000" defaultValue={v?.budget ?? ""} className={input} />
        </Field>

        <Field
          label="Additional notes (optional)"
          hint="Menu ideas, dietary needs, serving style, delivery time — anything that helps us quote."
          error={errors.notes}
        >
          <textarea name="notes" rows={4} maxLength={2000} defaultValue={v?.notes ?? ""} className={input} />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-7">
        <h2 className="font-display text-2xl font-semibold text-secondary">Your details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.contact_name}>
            <input
              name="contact_name"
              required
              maxLength={120}
              autoComplete="name"
              defaultValue={v ? v.contact_name : name}
              className={input}
            />
          </Field>
          <Field label="Phone" error={errors.contact_phone}>
            <input
              name="contact_phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="0803 123 4567"
              defaultValue={v ? v.contact_phone : phone}
              className={input}
            />
          </Field>
        </div>
        {email && (
          <p className="text-sm text-neutral-dark/70">
            We&apos;ll reply to <strong>{email}</strong> or call you.
          </p>
        )}
      </section>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <div className="sm:max-w-xs">
        <CtaButton type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Sending…" : "Request quote"}
        </CtaButton>
      </div>
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
