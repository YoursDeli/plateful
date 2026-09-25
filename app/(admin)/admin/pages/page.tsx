import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PageSlug } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Pages" };

const ORDER: PageSlug[] = ["about", "terms", "privacy"];

const updated = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

// About / Terms / Privacy (docs/pages-referrals-footer.md §2–3).
export default async function AdminPagesPage() {
  await requireStaff("/admin/pages");

  const supabase = await createClient();
  const { data, error } = await supabase.from("pages").select("slug, title, is_draft, updated_at");
  if (error) throw new Error("Couldn't load pages.");
  const pages = [...data].sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Pages</h1>
      <ul className="flex flex-col gap-3">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/admin/pages/${page.slug}`}
              className="flex flex-col gap-1 rounded-xl bg-white card-accent p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-secondary">{page.title.replaceAll("{brand}", "").trim() || page.slug}</span>
                <span className="text-xs text-neutral-dark/60">
                  /{page.slug} · Updated {updated(page.updated_at)}
                </span>
              </span>
              {page.is_draft ? (
                <span className="self-start rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 sm:self-center">
                  Draft
                </span>
              ) : (
                <span className="self-start rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-900 sm:self-center">
                  Published
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
