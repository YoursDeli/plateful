"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { emptyToNull, formValues, type FormState } from "@/lib/form-state";
import { toWhatsAppNumber } from "@/lib/phone";
import { storagePathFromUrl } from "@/lib/storage/images";
import { removeStoredImage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/server";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex color like #3B2A60");

const brandingSchema = z.object({
  brand_name: z.string().trim().min(1, "Brand name is required").max(60),
  primary_color: hex,
  accent_color: hex,
  logo_url: z
    .string()
    .nullable()
    .refine((url) => url === null || storagePathFromUrl(url, "branding") !== null, "Invalid logo"),
});

const BRANDING_FIELDS = ["brand_name", "primary_color", "accent_color", "logo_url"] as const;

export async function saveBranding(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/settings");

  const parsed = brandingSchema.safeParse({
    brand_name: formData.get("brand_name") ?? "",
    primary_color: formData.get("primary_color") ?? "",
    accent_color: formData.get("accent_color") ?? "",
    logo_url: emptyToNull(formData.get("logo_url")),
  });
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: formValues(formData, BRANDING_FIELDS),
    };
  }

  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("site_settings")
    .select("logo_url")
    .eq("id", 1)
    .maybeSingle();

  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) {
    console.error("saveBranding failed:", error.code, error.message);
    return {
      error: "Couldn't save branding. Please try again.",
      values: formValues(formData, BRANDING_FIELDS),
    };
  }

  if (previous && previous.logo_url !== parsed.data.logo_url) {
    await removeStoredImage(supabase, previous.logo_url, "branding");
  }

  // Brand name + colors are read by the root layout on every page.
  revalidatePath("/", "layout");
  return { ok: true };
}

// Delivery pricing — read by create_order() at checkout (authoritative) and
// by the checkout summary (display).
const nairaField = z
  .string()
  .trim()
  .regex(/^\d{1,8}(\.\d{1,2})?$/, "Enter an amount in naira, e.g. 1500");

const deliverySchema = z.object({
  delivery_fee: nairaField.transform(Number),
  free_delivery_threshold: nairaField
    .transform(Number)
    .refine((n) => n > 0, "Must be more than 0")
    .nullable(),
});

const DELIVERY_FIELDS = ["delivery_fee", "free_delivery_threshold"] as const;

export async function saveDelivery(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/settings");

  const parsed = deliverySchema.safeParse({
    delivery_fee: String(formData.get("delivery_fee") ?? ""),
    free_delivery_threshold: emptyToNull(formData.get("free_delivery_threshold")),
  });
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: formValues(formData, DELIVERY_FIELDS),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) {
    console.error("saveDelivery failed:", error.code, error.message);
    return { error: "Couldn't save delivery pricing.", values: formValues(formData, DELIVERY_FIELDS) };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// Where "New order" alert emails go. Blank = BREVO_SENDER_EMAIL.
const notificationsSchema = z.object({
  order_notification_email: z.email("Enter a valid email address").nullable(),
});

export async function saveNotifications(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/settings");

  const parsed = notificationsSchema.safeParse({
    order_notification_email: emptyToNull(formData.get("order_notification_email")),
  });
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: formValues(formData, ["order_notification_email"]),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) {
    console.error("saveNotifications failed:", error.code, error.message);
    return { error: "Couldn't save notification settings.", values: formValues(formData, ["order_notification_email"]) };
  }
  return { ok: true };
}

// Contact & footer (docs/pages-referrals-footer.md §4). WhatsApp powers the
// "Message us" buttons; everything here is shown in the site-wide footer.
// Blank fields are hidden.
const httpsUrl = z
  .string()
  .max(300)
  .regex(/^https:\/\/\S+$/, "Paste the full link, starting with https://")
  .nullable();

const contactSchema = z.object({
  tagline: z.string().max(120, "Keep it under 120 characters").nullable(),
  opening_hours: z.string().max(300, "Keep it under 300 characters").nullable(),
  location: z.string().max(200).nullable(),
  contact_phone: z
    .string()
    .max(30)
    .regex(/^\+?[\d\s()-]{7,}$/, "Enter a phone number, e.g. +234 816 269 4737")
    .nullable(),
  contact_email: z.email("Enter a valid email address").nullable(),
  instagram_url: httpsUrl,
  tiktok_url: httpsUrl,
  facebook_url: httpsUrl,
  x_url: httpsUrl,
});

const CONTACT_FIELDS = [
  "whatsapp_number",
  "tagline",
  "opening_hours",
  "location",
  "contact_phone",
  "contact_email",
  "instagram_url",
  "tiktok_url",
  "facebook_url",
  "x_url",
] as const;

export async function saveContact(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/settings");

  const raw = emptyToNull(formData.get("whatsapp_number"));
  const whatsapp_number = raw === null ? null : toWhatsAppNumber(raw);
  const parsed = contactSchema.safeParse({
    tagline: emptyToNull(formData.get("tagline")),
    // Textarea line breaks arrive as \r\n; store plain \n.
    opening_hours: emptyToNull(formData.get("opening_hours"))?.replace(/\r\n?/g, "\n") ?? null,
    location: emptyToNull(formData.get("location")),
    contact_phone: emptyToNull(formData.get("contact_phone")),
    contact_email: emptyToNull(formData.get("contact_email")),
    instagram_url: emptyToNull(formData.get("instagram_url")),
    tiktok_url: emptyToNull(formData.get("tiktok_url")),
    facebook_url: emptyToNull(formData.get("facebook_url")),
    x_url: emptyToNull(formData.get("x_url")),
  });

  const fieldErrors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : { ...z.flattenError(parsed.error).fieldErrors };
  if (raw !== null && whatsapp_number === null) {
    fieldErrors.whatsapp_number = ["Enter a valid number, e.g. 0803 123 4567 or +234 803 123 4567"];
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: formValues(formData, CONTACT_FIELDS) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({ whatsapp_number, ...parsed.data })
    .eq("id", 1);
  if (error) {
    console.error("saveContact failed:", error.code, error.message);
    return { error: "Couldn't save contact settings.", values: formValues(formData, CONTACT_FIELDS) };
  }
  // The footer is part of the storefront layout on every page.
  revalidatePath("/", "layout");
  return { ok: true };
}

// Referral reward credited to the referrer (docs/pages-referrals-footer.md §5).
// Locked into each referral when it completes, so changes aren't retroactive.
export async function saveReferrals(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/settings");

  const parsed = z
    .object({ referral_bonus_amount: nairaField.transform(Number) })
    .safeParse({ referral_bonus_amount: String(formData.get("referral_bonus_amount") ?? "") });
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: formValues(formData, ["referral_bonus_amount"]),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) {
    console.error("saveReferrals failed:", error.code, error.message);
    return { error: "Couldn't save the referral bonus.", values: formValues(formData, ["referral_bonus_amount"]) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Loyalty program switch + earn rate (docs/accounts-loyalty-and-images.md §2).
// Turning it off stops new earning/redemption but keeps everyone's balance.
export async function saveLoyalty(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/settings");

  const parsed = z
    .object({
      loyalty_enabled: z.boolean(),
      loyalty_points_per_1000: z
        .string()
        .trim()
        .regex(/^\d{1,4}(\.\d{1,2})?$/, "Enter points per ₦1,000, e.g. 10")
        .transform(Number)
        .pipe(z.number().min(0).max(1000, "Keep it at 1,000 or less")),
    })
    .safeParse({
      loyalty_enabled: formData.get("loyalty_enabled") === "on",
      loyalty_points_per_1000: String(formData.get("loyalty_points_per_1000") ?? ""),
    });
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: formValues(formData, ["loyalty_enabled", "loyalty_points_per_1000"]),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) {
    console.error("saveLoyalty failed:", error.code, error.message);
    return {
      error: "Couldn't save loyalty settings.",
      values: formValues(formData, ["loyalty_enabled", "loyalty_points_per_1000"]),
    };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
