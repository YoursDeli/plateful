"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { saveAnnouncement } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function AnnouncementForm({ text }: { text: string | null }) {
  const [state, action, pending] = useActionState(saveAnnouncement, initialFormState);
  const error = state.fieldErrors?.announcement_text?.[0];

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Announcement text
        <textarea
          name="announcement_text"
          rows={2}
          maxLength={300}
          defaultValue={state.values ? state.values.announcement_text : (text ?? "")}
          className={inputClass}
        />
        {error ? (
          <span className="text-xs font-normal text-red-700">{error}</span>
        ) : (
          <span className="text-xs font-normal text-neutral-dark/65">
            Scrolls continuously just under the header on every page. Leave blank to hide the bar.
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
