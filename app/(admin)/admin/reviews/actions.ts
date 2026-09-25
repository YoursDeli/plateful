"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Hide or re-show one review. Hidden reviews drop out of the dish page and
// the cached star average straight away (set_review_hidden + trigger).
export async function setReviewHidden(formData: FormData) {
  await requireStaff("/admin/reviews");

  const parsed = z
    .object({ id: z.uuid(), hidden: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), hidden: formData.get("hidden") });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: menuItemId, error } = await supabase.rpc("set_review_hidden", {
    p_review_id: parsed.data.id,
    p_hidden: parsed.data.hidden === "true",
  });
  if (error) {
    console.error("set_review_hidden failed:", error.code, error.message);
    throw new Error("Couldn't update the review. Please try again.");
  }

  if (menuItemId) revalidatePath(`/menu/${menuItemId}`);
  revalidatePath("/menu");
  revalidatePath("/");
  revalidatePath("/admin/reviews");
}
