"use client";

import { useActionState, useEffect, useRef } from "react";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { initialFormState } from "@/lib/form-state";
import type { BowlSize } from "@/lib/supabase/types";
import { createBowlSize, deleteBowlSize, moveBowlSize, renameBowlSize } from "./actions";

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-neutral-dark/20 bg-white px-3 py-2 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

// Shared bowl sizes (client, 2026-09-28). Each dish sets its own price per
// size in the dish form; a dish with no size prices keeps one price.
export function BowlSizesPanel({ sizes }: { sizes: BowlSize[] }) {
  return (
    <details className="rounded-xl bg-white card-accent p-4 shadow-sm">
      <summary className="cursor-pointer font-medium">
        Bowl sizes <span className="text-neutral-dark/65">({sizes.length})</span>
      </summary>
      <div className="mt-4 flex flex-col gap-3">
        <p className="text-xs text-neutral-dark/65">
          Name each size once here (e.g. Small, Medium, Large, 1 litre). Then open a dish and enter a price for each size
          it comes in.
        </p>
        <ul className="flex flex-col gap-2">
          {sizes.map((size, index) => (
            <SizeRow
              key={size.id}
              size={size}
              isFirst={index === 0}
              isLast={index === sizes.length - 1}
            />
          ))}
        </ul>
        <NewSizeForm />
      </div>
    </details>
  );
}

function SizeRow({
  size,
  isFirst,
  isLast,
}: {
  size: BowlSize;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [state, action, pending] = useActionState(renameBowlSize, initialFormState);

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <form action={action} className="flex min-w-0 flex-1 basis-56 gap-2">
          <input type="hidden" name="id" value={size.id} />
          <input
            name="name"
            defaultValue={size.name}
            aria-label={`Name for ${size.name}`}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-btn border border-secondary px-3 py-1.5 text-sm text-secondary disabled:opacity-60"
          >
            {pending ? "Saving…" : "Rename"}
          </button>
        </form>
        <div className="flex items-center gap-1 text-sm">
          <form action={moveBowlSize}>
            <input type="hidden" name="id" value={size.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              aria-label={`Move ${size.name} up`}
              className="rounded-btn px-2.5 py-1.5 hover:bg-neutral-dark/5 disabled:opacity-30"
            >
              ↑
            </button>
          </form>
          <form action={moveBowlSize}>
            <input type="hidden" name="id" value={size.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              aria-label={`Move ${size.name} down`}
              className="rounded-btn px-2.5 py-1.5 hover:bg-neutral-dark/5 disabled:opacity-30"
            >
              ↓
            </button>
          </form>
          <form action={deleteBowlSize}>
            <input type="hidden" name="id" value={size.id} />
            <ConfirmSubmitButton
              message={`Delete the "${size.name}" bowl size? Its prices on every dish are removed too.`}
              className="rounded-btn px-2.5 py-1.5 text-red-700 hover:bg-red-50"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </li>
  );
}

function NewSizeForm() {
  const [state, action, pending] = useActionState(createBowlSize, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-1 border-t border-neutral-dark/10 pt-3">
      <form ref={formRef} action={action} className="flex gap-2">
        <input name="name" placeholder="New size (e.g. Large)" aria-label="New bowl size name" className={inputClass} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-btn bg-primary px-4 py-1.5 text-sm font-medium text-secondary disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </div>
  );
}
