import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FaqEditor } from "./faq-editor";

export const metadata: Metadata = { title: "FAQ" };

export default async function AdminFaqPage() {
  await requireStaff("/admin/faq");
  const supabase = await createClient();
  const { data: faqs, error } = await supabase.from("faqs").select("*").order("sort_order").order("created_at");
  if (error) throw new Error("Couldn't load the FAQ.");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/pages" className="text-sm text-secondary underline-offset-4 hover:underline">
          Pages
        </Link>
        <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">FAQ</h1>
        <p className="text-sm text-neutral-dark/70">
          Shown on the FAQ page (linked in the footer). Questions ticked &quot;Also show on checkout&quot; appear under
          the checkout form too. Tap a question to edit it.
        </p>
      </div>
      <FaqEditor faqs={faqs} />
    </div>
  );
}
