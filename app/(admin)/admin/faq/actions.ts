"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// FAQ entries: /faq shows every published one; checkout shows those ticked
// "Show on checkout".
const faqSchema = z.object({
  id: z.uuid().nullable(),
  question: z.string().trim().min(1, "Enter the question").max(300, "Keep the question under 300 characters"),
  answer: z.string().trim().min(1, "Enter the answer").max(3000, "Keep the answer under 3,000 characters"),
  show_on_checkout: z.boolean(),
  is_published: z.boolean(),
});

function revalidateFaqs() {
  revalidatePath("/faq");
  revalidatePath("/checkout");
  revalidatePath("/admin/faq");
}

export async function saveFaq(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/faq");
  const parsed = faqSchema.safeParse({
    id: formData.get("id") || null,
    question: formData.get("question") ?? "",
    answer: String(formData.get("answer") ?? "").replace(/\r\n?/g, "\n"),
    show_on_checkout: formData.get("show_on_checkout") === "on",
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the question and answer." };
  const { id, ...values } = parsed.data;

  const supabase = await createClient();
  let error;
  if (id) {
    ({ error } = await supabase.from("faqs").update(values).eq("id", id));
  } else {
    const { data: last } = await supabase
      .from("faqs")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    ({ error } = await supabase.from("faqs").insert({ ...values, sort_order: (last?.sort_order ?? -1) + 1 }));
  }
  if (error) {
    console.error("saveFaq failed:", error.code, error.message);
    return { error: "Couldn't save. Please try again." };
  }
  revalidateFaqs();
  return { ok: true };
}

export async function deleteFaq(formData: FormData) {
  await requireStaff("/admin/faq");
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete the question.");
  revalidateFaqs();
}

export async function moveFaq(formData: FormData) {
  await requireStaff("/admin/faq");
  const id = z.uuid().parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));

  const supabase = await createClient();
  const { data: faqs, error } = await supabase.from("faqs").select("id, sort_order").order("sort_order").order("created_at");
  if (error || !faqs) throw new Error("Couldn't load the FAQ.");

  const from = faqs.findIndex((f) => f.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= faqs.length) return;
  const reordered = [...faqs];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];

  for (const [index, faq] of reordered.entries()) {
    if (faq.sort_order === index) continue;
    const { error: updateError } = await supabase.from("faqs").update({ sort_order: index }).eq("id", faq.id);
    if (updateError) throw new Error("Couldn't reorder the FAQ.");
  }
  revalidateFaqs();
}
