import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { HeartButton } from "@/components/favorites/heart-button";
import { PriceRow } from "@/components/menu/price-row";
import { ProductPurchase, ShareDishButton } from "@/components/menu/product-purchase";
import { RatingRow } from "@/components/menu/rating-row";
import { getCategories, getMenuItem, getReviews } from "@/lib/menu";

// All dish pages render on first visit, then stay cached until an admin edit
// revalidates them (docs: "All paths at runtime" → empty generateStaticParams).
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

const isUuid = (id: string) => z.uuid().safeParse(id).success;

export async function generateMetadata({ params }: PageProps<"/menu/[itemId]">): Promise<Metadata> {
  const { itemId } = await params;
  const item = isUuid(itemId) ? await getMenuItem(itemId) : null;
  if (!item) return { title: "Dish not found" };
  return {
    title: item.name,
    description: item.description ?? undefined,
    openGraph: item.image_url ? { images: [{ url: item.image_url }] } : undefined,
  };
}

// docs/menu-and-product-page.md §2 — deliberately no seller info, courier
// logos, stock counters or trust badges.
export default async function MenuItemPage({ params }: PageProps<"/menu/[itemId]">) {
  const { itemId } = await params;
  if (!isUuid(itemId)) notFound();

  const [item, categories] = await Promise.all([getMenuItem(itemId), getCategories()]);
  if (!item) notFound();

  const reviews = item.review_count > 0 ? await getReviews(item.id) : [];
  const category = categories.find((c) => c.id === item.category_id);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-dark/60">
        <Link href="/menu" className="hover:underline">Menu</Link>
        {category && (
          <>
            <span aria-hidden="true"> / </span>
            <Link href={`/menu?category=${category.id}`} className="hover:underline">{category.name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Single photo: multi-photo galleries only once real extra shots exist (§2). */}
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-primary/30 shadow-lg md:aspect-[4/5]">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className={`object-cover ${item.is_available ? "" : "grayscale"}`}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-7xl">🍽️</span>
          )}
          {item.badge && (
            <span className="absolute top-4 left-4 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold tracking-wide text-primary uppercase shadow">
              {item.badge}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5 md:py-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl leading-tight font-semibold text-secondary sm:text-5xl">
              {item.name}
            </h1>
            <RatingRow rating={item.avg_rating} count={item.review_count} />
          </div>
          <PriceRow item={item} size="lg" />
          {item.description && (
            <p className="text-base leading-relaxed whitespace-pre-line text-neutral-dark/80">
              {item.description}
            </p>
          )}
          {!item.is_available && (
            <p className="rounded-xl bg-neutral-dark/5 px-4 py-3 text-sm text-neutral-dark/70">
              This dish is sold out for today — check back soon.
            </p>
          )}
          <ProductPurchase item={item} />
          <div className="flex flex-wrap gap-2 border-t border-secondary/10 pt-5">
            <HeartButton menuItemId={item.id} name={item.name} variant="inline" />
            <ShareDishButton name={item.name} />
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <section aria-labelledby="reviews-heading" className="flex flex-col gap-4">
          <h2 id="reviews-heading" className="font-display text-2xl font-semibold text-secondary">
            What people are saying
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-primary font-semibold text-secondary">
                    {r.reviewer_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{r.reviewer_name}</span>
                    <time dateTime={r.created_at} className="text-xs text-neutral-dark/50">
                      {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </time>
                  </div>
                  <span className="ml-auto text-amber-500" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                    <span aria-hidden="true" className="text-neutral-dark/20">{"★".repeat(5 - r.rating)}</span>
                  </span>
                </div>
                {r.comment && <p className="text-sm text-neutral-dark/80">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
