"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { emptyToNull, formValues, type FormState } from "@/lib/form-state";
import { storagePathFromUrl } from "@/lib/storage/images";
import { removeStoredImage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/server";

const FIELDS = ["title", "content", "chef_photo_url", "is_draft"] as const;

const pageSchema = z.object({
  slug: z.enum(["about", "terms", "privacy"]),
  title: z.string().trim().min(1, "Title is required").max(120, "Keep the title under 120 characters"),
  content: z.string().max(50000, "That's too long — keep it under 50,000 characters"),
  is_draft: z.boolean(),
  chef_photo_url: z
    .string()
    .nullable()
    .refine((url) => url === null || storagePathFromUrl(url, "pages") !== null, "Invalid photo"),
});

// Saves one of About / Terms / Privacy as the signed-in staff user; the
// pages table's RLS only lets staff update.
export async function savePage(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = String(formData.get("slug") ?? "");
  await requireStaff(`/admin/pages/${slug}`);

  const parsed = pageSchema.safeParse({
    slug,
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? "").replace(/\r\n?/g, "\n"),
    is_draft: formData.get("is_draft") === "on",
    // Only the About page has a chef photo.
    chef_photo_url: slug === "about" ? emptyToNull(formData.get("chef_photo_url")) : null,
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: formValues(formData, FIELDS) };
  }

  const { slug: pageSlug, ...update } = parsed.data;
  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("pages")
    .select("chef_photo_url")
    .eq("slug", pageSlug)
    .maybeSingle();

  const { data: saved, error } = await supabase
    .from("pages")
    .update(update)
    .eq("slug", pageSlug)
    .select("slug")
    .maybeSingle();
  if (error || !saved) {
    if (error) console.error("savePage failed:", error.code, error.message);
    return { error: "Couldn't save the page. Please try again.", values: formValues(formData, FIELDS) };
  }

  if (previous && previous.chef_photo_url !== update.chef_photo_url) {
    await removeStoredImage(supabase, previous.chef_photo_url, "pages");
  }

  revalidatePath(`/${pageSlug}`);
  revalidatePath("/admin/pages");
  return { ok: true };
}
