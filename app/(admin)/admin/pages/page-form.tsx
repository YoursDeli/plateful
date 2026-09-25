"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { initialFormState } from "@/lib/form-state";
import type { SitePage } from "@/lib/supabase/types";
import { savePage } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

function Hint({ error, children }: { error?: string; children?: React.ReactNode }) {
  if (error) return <span className="text-xs font-normal text-red-700">{error}</span>;
  return children ? <span className="text-xs font-normal text-neutral-dark/65">{children}</span> : null;
}

export function PageForm({ page }: { page: SitePage }) {
  const [state, action, pending] = useActionState(savePage, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <input type="hidden" name="slug" value={page.slug} />

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Title
        <input name="title" required maxLength={120} defaultValue={v ? v.title : page.title} className={inputClass} />
        <Hint error={errors.title?.[0]} />
      </label>

      {page.slug === "about" && (
        <ImageUploadField
          name="chef_photo_url"
          folder="pages"
          label="Chef photo"
          defaultValue={v ? v.chef_photo_url : page.chef_photo_url}
        />
      )}
      {errors.chef_photo_url && <Hint error={errors.chef_photo_url[0]} />}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Page text
        <textarea
          name="content"
          rows={20}
          maxLength={50000}
          defaultValue={v ? v.content : page.content}
          className={`${inputClass} font-mono leading-relaxed`}
        />
        <Hint error={errors.content?.[0]}>
          Leave a blank line between paragraphs. Start a line with <code>## </code> for a heading, <code>- </code> for a
          bullet point, and wrap words in <code>**double stars**</code> for bold. <code>{"{brand}"}</code> is replaced
          with your business name.
        </Hint>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="is_draft"
          defaultChecked={v ? v.is_draft === "on" : page.is_draft}
          className="mt-0.5 size-4 accent-secondary"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Draft</span>
          <span className="text-xs text-neutral-dark/65">
            Shows a &quot;this page is being reviewed&quot; notice at the top. Untick once the text is final.
          </span>
        </span>
      </label>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Saved.</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={`/${page.slug}`}
          target="_blank"
          className="rounded-btn border border-neutral-dark/20 px-5 py-2.5 text-center text-sm font-medium text-secondary"
        >
          View page
        </Link>
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
