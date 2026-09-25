"use client";

import { useActionState, useEffect, useRef } from "react";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { initialFormState } from "@/lib/form-state";
import type { Category } from "@/lib/supabase/types";
import { createCategory, deleteCategory, moveCategory, renameCategory } from "./actions";

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-neutral-dark/20 bg-white px-3 py-2 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function CategoriesPanel({ categories }: { categories: Category[] }) {
  return (
    <details className="rounded-xl bg-white card-accent p-4 shadow-sm" open={categories.length === 0}>
      <summary className="cursor-pointer font-medium">
        Categories <span className="text-neutral-dark/50">({categories.length})</span>
      </summary>
      <div className="mt-4 flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
            />
          ))}
        </ul>
        <NewCategoryForm />
      </div>
    </details>
  );
}

function CategoryRow({
  category,
  isFirst,
  isLast,
}: {
  category: Category;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [state, action, pending] = useActionState(renameCategory, initialFormState);

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <form action={action} className="flex min-w-0 flex-1 basis-56 gap-2">
          <input type="hidden" name="id" value={category.id} />
          <input
            name="name"
            defaultValue={category.name}
            aria-label={`Name for ${category.name}`}
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
          <form action={moveCategory}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              aria-label={`Move ${category.name} up`}
              className="rounded-btn px-2.5 py-1.5 hover:bg-neutral-dark/5 disabled:opacity-30"
            >
              ↑
            </button>
          </form>
          <form action={moveCategory}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              aria-label={`Move ${category.name} down`}
              className="rounded-btn px-2.5 py-1.5 hover:bg-neutral-dark/5 disabled:opacity-30"
            >
              ↓
            </button>
          </form>
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={category.id} />
            <ConfirmSubmitButton
              message={`Delete the "${category.name}" category? Its items will become uncategorised.`}
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

function NewCategoryForm() {
  const [state, action, pending] = useActionState(createCategory, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-1 border-t border-neutral-dark/10 pt-3">
      <form ref={formRef} action={action} className="flex gap-2">
        <input name="name" placeholder="New category (e.g. Mains)" aria-label="New category name" className={inputClass} />
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
