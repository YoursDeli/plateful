import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuBrowser, MenuBrowserFromUrl } from "@/components/menu/menu-browser";
import { getCategories, getMenuItems } from "@/lib/menu";

export const metadata: Metadata = { title: "Food Menu" };

// Static, refreshed on admin edits via revalidatePath("/", "layout");
// hourly revalidation is just a safety net.
export const revalidate = 3600;

export default async function MenuPage() {
  const [categories, items] = await Promise.all([getCategories(), getMenuItems()]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold text-secondary sm:text-5xl">Food Menu</h1>
        <p className="text-neutral-dark/65">Freshly made, every day. Tap a dish for details.</p>
      </header>
      {/* Reading ?category= needs a Suspense boundary; the fallback is the
          same menu, unfiltered, so the static HTML is fully usable. */}
      <Suspense fallback={<MenuBrowser categories={categories} items={items} />}>
        <MenuBrowserFromUrl categories={categories} items={items} />
      </Suspense>
    </main>
  );
}
