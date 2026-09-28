"use client";

import { useActionState, useEffect, useRef } from "react";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { initialFormState } from "@/lib/form-state";
import type { Faq } from "@/lib/supabase/types";
import { deleteFaq, moveFaq, saveFaq } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function FaqEditor({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {faqs.map((faq, index) => (
          <li key={faq.id}>
            <FaqItem faq={faq} isFirst={index === 0} isLast={index === faqs.length - 1} />
          </li>
        ))}
      </ul>
      <NewFaq />
    </div>
  );
}

function FaqItem({ faq, isFirst, isLast }: { faq: Faq; isFirst: boolean; isLast: boolean }) {
  const [state, action, pending] = useActionState(saveFaq, initialFormState);
  return (
    <details className={`rounded-xl bg-white card-accent p-4 shadow-sm ${faq.is_published ? "" : "opacity-75"}`}>
      <summary className="flex cursor-pointer items-start justify-between gap-3">
        <span className="font-medium text-secondary">{faq.question}</span>
        <span className="flex shrink-0 gap-1.5">
          {!faq.is_published && (
            <span className="rounded-full bg-neutral-dark/10 px-2 py-0.5 text-xs text-neutral-dark/80">Hidden</span>
          )}
          {faq.show_on_checkout && faq.is_published && (
            <span className="rounded-full bg-primary/60 px-2 py-0.5 text-xs text-secondary">Checkout</span>
          )}
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={faq.id} />
          <FaqFields faq={faq} />
          {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
          {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-btn bg-primary px-5 py-2 text-sm font-medium text-secondary disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-1 border-t border-neutral-dark/10 pt-3 text-sm">
          <form action={moveFaq}>
            <input type="hidden" name="id" value={faq.id} />
            <input type="hidden" name="direction" value="up" />
            <button type="submit" disabled={isFirst} className="rounded-btn px-3 py-1.5 hover:bg-neutral-dark/5 disabled:opacity-30">
              Move up
            </button>
          </form>
          <form action={moveFaq}>
            <input type="hidden" name="id" value={faq.id} />
            <input type="hidden" name="direction" value="down" />
            <button type="submit" disabled={isLast} className="rounded-btn px-3 py-1.5 hover:bg-neutral-dark/5 disabled:opacity-30">
              Move down
            </button>
          </form>
          <form action={deleteFaq} className="ml-auto">
            <input type="hidden" name="id" value={faq.id} />
            <ConfirmSubmitButton
              message="Delete this question? This can't be undone."
              className="rounded-btn px-3 py-1.5 text-red-700 hover:bg-red-50"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </details>
  );
}

function FaqFields({ faq }: { faq?: Faq }) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Question
        <input name="question" required maxLength={300} defaultValue={faq?.question} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Answer
        <textarea name="answer" required rows={4} maxLength={3000} defaultValue={faq?.answer} className={inputClass} />
        <span className="text-xs font-normal text-neutral-dark/65">
          Plain text. {"{brand}"} is replaced with your business name.
        </span>
      </label>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_published" defaultChecked={faq?.is_published ?? true} className="size-4 accent-secondary" />
          Show on the FAQ page
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="show_on_checkout"
            defaultChecked={faq?.show_on_checkout ?? true}
            className="size-4 accent-secondary"
          />
          Also show on checkout
        </label>
      </div>
    </>
  );
}

function NewFaq() {
  const [state, action, pending] = useActionState(saveFaq, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <p className="font-medium">Add a question</p>
      <FaqFields />
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Added.</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-btn bg-primary px-5 py-2 text-sm font-medium text-secondary disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add question"}
        </button>
      </div>
    </form>
  );
}
