"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const reviewSchema = z.object({
  menuItemId: z.uuid(),
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  comment: z.string().trim().max(1000, "Keep your review under 1,000 characters"),
});

// Create or edit the signed-in customer's review. submit_review() (security
// definer) checks the dish was actually delivered to them.
export async function submitReview(input: {
  menuItemId: string;
  rating: number;
  comment: string;
}): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your review." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_menu_item_id: parsed.data.menuItemId,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment || null,
  });
  if (error) {
    // 42501 / 22023 carry our own customer-friendly messages.
    if (error.code === "42501" || error.code === "22023") return { ok: false, error: error.message };
    console.error("submit_review failed:", error.code, error.message);
    return { ok: false, error: "Couldn't post your review. Please try again." };
  }

  // The dish page shows posted reviews; menu cards and home show the average.
  revalidatePath(`/menu/${parsed.data.menuItemId}`);
  revalidatePath("/menu");
  revalidatePath("/");
  revalidatePath("/account/reviews");
  return { ok: true };
}
