import Image from "next/image";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/markdown";
import { getPage, withBrand } from "@/lib/pages";
import { getSiteSettings } from "@/lib/site-settings";
import type { PageSlug } from "@/lib/supabase/types";

const updated = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" });

// Shared renderer for /about, /terms, /privacy (docs/pages-referrals-footer.md
// §2–3): readable long-form text + "Last updated", chef photo on About.
export async function ContentPage({ slug }: { slug: PageSlug }) {
  const [page, settings] = await Promise.all([getPage(slug), getSiteSettings()]);
  if (!page) notFound();

  const legal = slug !== "about";
  const title = withBrand(page.title, settings.brand_name);
  // About: "Meet Chef <name>" → small "Meet Chef" line over the name in large
  // type (client). Other titles render as one line.
  const split = slug === "about" ? /^(.*?\bChef)\s+(.+)$/i.exec(title) : null;
  const [kicker, rest] = split ? [split[1], split[2]] : [null, null];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
      {page.is_draft && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Draft — this page is being reviewed and may change.
        </p>
      )}

      {slug === "about" && page.chef_photo_url && (
        <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-full shadow-lg ring-8 ring-primary/40 sm:w-64">
          <Image src={page.chef_photo_url} alt={title} fill priority sizes="16rem" className="object-cover" />
        </div>
      )}

      <header className={`flex flex-col gap-2 ${slug === "about" ? "text-center" : ""}`}>
        {kicker ? (
          <h1 className="flex flex-col gap-1 text-secondary">
            <span className="text-lg font-medium sm:text-xl">{kicker}</span>
            <span className="font-display text-4xl font-semibold sm:text-5xl">{rest}</span>
          </h1>
        ) : (
          <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">{title}</h1>
        )}
        {legal && <p className="text-sm text-neutral-dark/65">Last updated {updated(page.updated_at)}</p>}
      </header>

      <article className={legal ? "rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-8" : ""}>
        <Markdown>{withBrand(page.content, settings.brand_name)}</Markdown>
      </article>
    </main>
  );
}

export async function contentPageTitle(slug: PageSlug) {
  const [page, settings] = await Promise.all([getPage(slug), getSiteSettings()]);
  return page ? withBrand(page.title, settings.brand_name) : undefined;
}
