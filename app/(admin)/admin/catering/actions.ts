"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { CATERING_STATUSES } from "@/lib/supabase/types";

// Staff track each request: status (shown to the customer) + private notes.
export async function updateCateringRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/catering");
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(CATERING_STATUSES),
      staff_notes: z.string().trim().max(2000, "Keep notes under 2,000 characters"),
    })
    .safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      staff_notes: String(formData.get("staff_notes") ?? "").replace(/\r\n?/g, "\n"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("catering_requests")
    .update({ status: parsed.data.status, staff_notes: parsed.data.staff_notes || null })
    .eq("id", parsed.data.id);
  if (error) {
    console.error("updateCateringRequest failed:", error.code, error.message);
    return { error: "Couldn't save. Please try again." };
  }
  revalidatePath("/admin/catering");
  revalidatePath("/account/catering");
  return { ok: true };
}
