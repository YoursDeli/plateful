"use client";

import { useActionState } from "react";
import { CATERING_STATUS } from "@/lib/catering/status";
import { initialFormState } from "@/lib/form-state";
import { CATERING_STATUSES, type CateringStatus } from "@/lib/supabase/types";
import { updateCateringRequest } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function RequestStatusForm({
  id,
  status,
  staffNotes,
}: {
  id: string;
  status: CateringStatus;
  staffNotes: string | null;
}) {
  const [state, action, pending] = useActionState(updateCateringRequest, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3 border-t border-neutral-dark/10 pt-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select name="status" defaultValue={status} className={inputClass}>
            {CATERING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CATERING_STATUS[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Staff notes (private)
          <textarea
            name="staff_notes"
            rows={2}
            maxLength={2000}
            defaultValue={staffNotes ?? ""}
            placeholder="Quote amount, follow-up date…"
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-3">
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-btn bg-primary px-4 py-2 text-sm font-medium text-secondary disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
