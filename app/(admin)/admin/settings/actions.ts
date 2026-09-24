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

// Restaurant WhatsApp number for "Message us on WhatsApp". Blank = hidden.
export async function saveContact(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/settings");

  const raw = emptyToNull(formData.get("whatsapp_number"));
  const whatsapp_number = raw === null ? null : toWhatsAppNumber(raw);
  if (raw !== null && whatsapp_number === null) {
    return {
      fieldErrors: { whatsapp_number: ["Enter a valid number, e.g. 0803 123 4567 or +234 803 123 4567"] },
      values: formValues(formData, ["whatsapp_number"]),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update({ whatsapp_number }).eq("id", 1);
  if (error) {
    console.error("saveContact failed:", error.code, error.message);
    return { error: "Couldn't save contact settings.", values: formValues(formData, ["whatsapp_number"]) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
