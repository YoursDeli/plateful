"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { formatWhatsAppNumber } from "@/lib/phone";
import type { SiteSettings } from "@/lib/supabase/types";
import { saveContact } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm";

type ContactSettings = Pick<
  SiteSettings,
  | "whatsapp_number"
  | "tagline"
  | "opening_hours"
  | "location"
  | "contact_phone"
  | "contact_email"
  | "instagram_url"
  | "tiktok_url"
  | "facebook_url"
  | "x_url"
>;

const SOCIALS = [
  { name: "instagram_url", label: "Instagram", placeholder: "https://www.instagram.com/yourpage" },
  { name: "tiktok_url", label: "TikTok", placeholder: "https://www.tiktok.com/@yourpage" },
  { name: "facebook_url", label: "Facebook", placeholder: "https://www.facebook.com/yourpage" },
  { name: "x_url", label: "X (Twitter)", placeholder: "https://x.com/yourpage" },
] as const;

function Hint({ error, children }: { error?: string; children?: React.ReactNode }) {
  if (error) return <span className="text-xs font-normal text-red-700">{error}</span>;
  return children ? <span className="text-xs font-normal text-neutral-dark/65">{children}</span> : null;
}

// Contact details + social links shown in the site-wide footer. Blank = hidden.
export function ContactForm({ settings }: { settings: ContactSettings }) {
  const [state, action, pending] = useActionState(saveContact, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const value = (key: keyof ContactSettings) => (v ? v[key] : (settings[key] ?? ""));

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-white card-accent p-4 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tagline
        <input name="tagline" maxLength={120} defaultValue={value("tagline")} className={inputClass} />
        <Hint error={errors.tagline?.[0]}>A short line under the name in the footer.</Hint>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Opening hours
        <textarea
          name="opening_hours"
          rows={3}
          maxLength={300}
          placeholder={"Mon–Sat: 10am – 9pm\nSun: Closed"}
          defaultValue={value("opening_hours")}
          className={inputClass}
        />
        <Hint error={errors.opening_hours?.[0]}>Each line shows on its own line in the footer.</Hint>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Location / delivery area
        <input name="location" maxLength={200} placeholder="Warri, Delta State" defaultValue={value("location")} className={inputClass} />
        <Hint error={errors.location?.[0]} />
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Phone
          <input
            name="contact_phone"
            type="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="+234 816 269 4737"
            defaultValue={value("contact_phone")}
            className={inputClass}
          />
          <Hint error={errors.contact_phone?.[0]}>Tap-to-call in the footer.</Hint>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            name="contact_email"
            type="email"
            placeholder="hello@example.com"
            defaultValue={value("contact_email")}
            className={inputClass}
          />
          <Hint error={errors.contact_email?.[0]} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        WhatsApp number
        <input
          name="whatsapp_number"
          type="tel"
          inputMode="tel"
          placeholder="0803 123 4567"
          defaultValue={v ? v.whatsapp_number : settings.whatsapp_number ? formatWhatsAppNumber(settings.whatsapp_number) : ""}
          className={inputClass}
        />
        <Hint error={errors.whatsapp_number?.[0]}>
          Customers can message this number about their order. Leave blank to hide the WhatsApp button.
        </Hint>
      </label>

      <fieldset className="flex flex-col gap-4 border-t border-neutral-dark/10 pt-5">
        <legend className="sr-only">Social links</legend>
        <p className="text-sm font-medium">
          Social links <span className="font-normal text-neutral-dark/65">— only the ones you fill in are shown</span>
        </p>
        {SOCIALS.map((s) => (
          <label key={s.name} className="flex flex-col gap-1.5 text-sm font-medium">
            {s.label}
            <input name={s.name} type="url" inputMode="url" placeholder={s.placeholder} defaultValue={value(s.name)} className={inputClass} />
            <Hint error={errors[s.name]?.[0]} />
          </label>
        ))}
      </fieldset>

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
