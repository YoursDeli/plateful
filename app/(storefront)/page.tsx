import Link from "next/link";
import { HomeFavoritesRow } from "@/components/favorites/favorites-grid";
import { HeroSection } from "@/components/hero/hero-section";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { getCategories, getFeaturedItems, getMenuItems, getPopularItems } from "@/lib/menu";
import { getSiteSettings } from "@/lib/site-settings";

export const revalidate = 3600;

export default async function HomePage() {
  const [settings, featured, categories, popular, allItems] = await Promise.all([
    getSiteSettings(),
    getFeaturedItems(),
    getCategories(),
    getPopularItems(8),
    getMenuItems(),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const hasBestsellers = allItems.some((i) => i.badge === "Bestseller" && i.is_available);

  return (
    <main className="flex flex-1 flex-col">
      {featured.length > 0 ? (
        <HeroSection items={featured} settings={settings} />
      ) : (
        // Until the admin picks hero dishes (Hero position in /admin/menu).
        <section className="bg-gradient-to-br from-secondary to-secondary/80 px-4 py-20 text-center text-white sm:py-28">
          <h1 className="font-display text-5xl font-semibold text-primary sm:text-6xl">
            {settings.brand_name}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
            Good food, made with care — order in a few taps.
          </p>
          <Link
            href="/menu"
            className="mt-8 inline-block rounded-btn bg-primary px-6 py-3 font-semibold text-secondary"
          >
            Browse the menu
          </Link>
        </section>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:py-14">
        {categories.length > 0 && (
          <section aria-labelledby="home-categories" className="flex flex-col gap-4">
            <h2 id="home-categories" className="font-display text-2xl font-semibold text-secondary">
              What are you craving?
            </h2>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {categories.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={`/menu?category=${c.id}`}
                    className="block rounded-btn bg-white px-5 py-2.5 text-sm font-medium text-secondary shadow-sm ring-1 ring-secondary/10 transition hover:bg-primary/50"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {popular.length > 0 && (
          <section aria-labelledby="home-popular" className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 id="home-popular" className="font-display text-2xl font-semibold text-secondary">
                {hasBestsellers ? "Bestsellers" : "Popular right now"}
              </h2>
              <Link href="/menu" className="text-sm font-medium text-secondary underline-offset-4 hover:underline">
                Full food menu →
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {popular.map((item) => (
                <li key={item.id}>
                  <MenuItemCard
                    item={item}
                    categoryName={item.category_id ? categoryName.get(item.category_id) : null}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Signed-in visitors with saved dishes only (filled client-side). */}
        <HomeFavoritesRow items={allItems} categories={categories} />
      </div>
    </main>
  );
}
