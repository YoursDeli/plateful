"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { formatWhatsAppNumber } from "@/lib/phone";
import { saveContact } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function ContactForm({ whatsapp }: { whatsapp: string | null }) {
  const [state, action, pending] = useActionState(saveContact, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white p-4 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        WhatsApp number
        <input
          name="whatsapp_number"
          type="tel"
          inputMode="tel"
          placeholder="0803 123 4567"
          defaultValue={v ? v.whatsapp_number : whatsapp ? formatWhatsAppNumber(whatsapp) : ""}
          className={inputClass}
        />
        {errors.whatsapp_number ? (
          <span className="text-xs font-normal text-red-700">{errors.whatsapp_number[0]}</span>
        ) : (
          <span className="text-xs font-normal text-neutral-dark/60">
            Customers can message this number about their order. Leave blank to hide the WhatsApp button.
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
