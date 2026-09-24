"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emptyToNull, formValues, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name").max(120),
  // Nigerian numbers in local (080…) or international (+234…) form; kept
  // permissive — checkout (step 6) is where a phone becomes required.
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{6,18}$/, "Enter a valid phone number, e.g. 0803 123 4567")
    .nullable(),
  default_address: z.string().trim().max(500).nullable(),
});

const FIELDS = ["full_name", "phone", "default_address"] as const;

// Writes through the user's own session: RLS limits it to their row and the
// column grant limits it to these three fields (role etc. are untouchable).
export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name") ?? "",
    phone: emptyToNull(formData.get("phone")),
    default_address: emptyToNull(formData.get("default_address")),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: formValues(formData, FIELDS) };
  }

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    console.error("saveProfile failed:", error.code);
    return { error: "Couldn't save your details. Please try again.", values: formValues(formData, FIELDS) };
  }

  revalidatePath("/account");
  return { ok: true };
}
