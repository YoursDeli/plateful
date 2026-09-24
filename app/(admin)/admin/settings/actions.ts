"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { isOwnCloudinaryUrl } from "@/lib/cloudinary/sign";
import { emptyToNull, formValues, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex color like #3B2A60");

const brandingSchema = z.object({
  brand_name: z.string().trim().min(1, "Brand name is required").max(60),
  primary_color: hex,
  accent_color: hex,
  logo_url: z
    .string()
    .nullable()
    .refine((url) => url === null || isOwnCloudinaryUrl(url, "branding"), "Invalid logo"),
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
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) {
    console.error("saveBranding failed:", error.code, error.message);
    return {
      error: "Couldn't save branding. Please try again.",
      values: formValues(formData, BRANDING_FIELDS),
    };
  }

  // Brand name + colors are read by the root layout on every page.
  revalidatePath("/", "layout");
  return { ok: true };
}
