"use client";

import { useActionState, useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { initialFormState } from "@/lib/form-state";
import type { SiteSettings } from "@/lib/supabase/types";
import { saveBranding } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

export function BrandingForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveBranding, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white p-4 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Brand name
        <input
          name="brand_name"
          required
          maxLength={60}
          defaultValue={v ? v.brand_name : settings.brand_name}
          className={inputClass}
        />
        {errors.brand_name && <span className="text-xs font-normal text-red-700">{errors.brand_name[0]}</span>}
      </label>

      <ImageUploadField
        name="logo_url"
        folder="branding"
        label="Logo"
        defaultValue={v ? v.logo_url : settings.logo_url}
      />
      {errors.logo_url && <p className="text-sm text-red-700">{errors.logo_url[0]}</p>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ColorField
          name="primary_color"
          label="Primary color"
          hint="Primary buttons, highlights (default Lavender)"
          initial={v ? v.primary_color : settings.primary_color}
          error={errors.primary_color}
        />
        <ColorField
          name="accent_color"
          label="Secondary color"
          hint="Header/footer, secondary buttons (default Velvet)"
          initial={v ? v.accent_color : settings.accent_color}
          error={errors.accent_color}
        />
      </div>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-800">Branding saved.</p>}

      <div className="flex sm:justify-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-secondary disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Saving…" : "Save branding"}
        </button>
      </div>
    </form>
  );
}

function ColorField({
  name,
  label,
  hint,
  initial,
  error,
}: {
  name: string;
  label: string;
  hint: string;
  initial: string;
  error?: string[];
}) {
  const [value, setValue] = useState(initial);
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value);

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium">
      <label htmlFor={name}>{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : "#000000"}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-neutral-dark/20 bg-white p-1"
        />
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          pattern="#[0-9A-Fa-f]{6}"
          required
          className={`${inputClass} font-mono uppercase`}
        />
      </div>
      {error ? (
        <span className="text-xs font-normal text-red-700">{error[0]}</span>
      ) : (
        <span className="text-xs font-normal text-neutral-dark/60">{hint}</span>
      )}
    </div>
  );
}
