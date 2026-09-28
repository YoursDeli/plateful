"use client";

import { useActionState, useEffect, useRef } from "react";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { initialFormState } from "@/lib/form-state";
import type { DeliveryZone } from "@/lib/supabase/types";
import { deleteZone, saveZone } from "./actions";

const inputClass =
  "w-full min-w-0 rounded-lg border border-neutral-dark/20 bg-white px-3 py-2 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

// Delivery areas and their prices (checkout dropdown). Each row saves on its
// own; turning an area off hides it from checkout without deleting it.
export function ZonesPanel({ zones }: { zones: DeliveryZone[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-medium">Delivery areas</p>
        <p className="text-xs text-neutral-dark/65">
          Customers pick one of these at checkout. Untick &quot;Offered&quot; to hide an area without deleting it.
        </p>
      </div>
      {zones.length === 0 && (
        <p className="text-sm text-amber-800">No areas yet — customers can only choose Pickup until you add one.</p>
      )}
      <ul className="flex flex-col gap-3">
        {zones.map((zone) => (
          <ZoneRow key={zone.id} zone={zone} />
        ))}
      </ul>
      <NewZoneForm />
    </div>
  );
}

function ZoneRow({ zone }: { zone: DeliveryZone }) {
  const [state, action, pending] = useActionState(saveZone, initialFormState);
  return (
    <li className="flex flex-col gap-1 border-b border-neutral-dark/10 pb-3 last:border-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form action={action} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <input type="hidden" name="id" value={zone.id} />
          <input name="name" defaultValue={zone.name} aria-label="Area name" className={`${inputClass} sm:flex-[2]`} />
          <label className="flex items-center gap-2 text-sm sm:flex-1">
            <span className="shrink-0 text-neutral-dark/70">₦</span>
            <input
              name="fee"
              inputMode="decimal"
              defaultValue={String(zone.fee)}
              aria-label={`Delivery price for ${zone.name}`}
              className={inputClass}
            />
          </label>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={zone.is_active} className="size-4 accent-secondary" />
            Offered
          </label>
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-btn border border-secondary px-3 py-1.5 text-sm text-secondary disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
        <form action={deleteZone}>
          <input type="hidden" name="id" value={zone.id} />
          <ConfirmSubmitButton
            message={`Delete the "${zone.name}" delivery area? Past orders keep their area name.`}
            className="rounded-btn px-2.5 py-1.5 text-sm text-red-700 hover:bg-red-50"
          >
            Delete
          </ConfirmSubmitButton>
        </form>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}
    </li>
  );
}

function NewZoneForm() {
  const [state, action, pending] = useActionState(saveZone, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-1 border-t border-neutral-dark/10 pt-3">
      <form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="is_active" value="on" />
        <input name="name" placeholder="New area (e.g. Effurun)" aria-label="New area name" className={`${inputClass} sm:flex-[2]`} />
        <label className="flex items-center gap-2 text-sm sm:flex-1">
          <span className="shrink-0 text-neutral-dark/70">₦</span>
          <input name="fee" inputMode="decimal" placeholder="Price" aria-label="New area delivery price" className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-btn bg-primary px-4 py-2 text-sm font-medium text-secondary disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add area"}
        </button>
      </form>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </div>
  );
}
