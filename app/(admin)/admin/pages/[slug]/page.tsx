import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PageSlug } from "@/lib/supabase/types";
import { PageForm } from "../page-form";

export const metadata: Metadata = { title: "Edit page" };

const SLUGS: readonly PageSlug[] = ["about", "terms", "privacy"];

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[slug]">) {
  const { slug } = await params;
  await requireStaff(`/admin/pages/${slug}`);
  if (!SLUGS.includes(slug as PageSlug)) notFound();

  const supabase = await createClient();
  const { data: page } = await supabase.from("pages").select("*").eq("slug", slug as PageSlug).maybeSingle();
  if (!page) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Edit /{page.slug}</h1>
      <PageForm page={page} />
    </div>
  );
}
