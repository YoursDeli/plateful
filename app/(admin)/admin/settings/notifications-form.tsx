"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { saveNotifications } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function NotificationsForm({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState(saveNotifications, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white p-4 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        New-order alert email
        <input
          name="order_notification_email"
          type="email"
          inputMode="email"
          placeholder="Uses your Brevo sender address"
          defaultValue={v ? v.order_notification_email : (email ?? "")}
          className={inputClass}
        />
        {errors.order_notification_email ? (
          <span className="text-xs font-normal text-red-700">{errors.order_notification_email[0]}</span>
        ) : (
          <span className="text-xs font-normal text-neutral-dark/60">
            Gets an email for every paid order. Leave blank to use the Brevo sender address.
          </span>
        )}
      </label>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}

      <div className="flex sm:justify-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-secondary disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
