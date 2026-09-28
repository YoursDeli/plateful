"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Category, MenuDish } from "@/lib/supabase/types";
import { MenuItemCard } from "./menu-item-card";

const ALL = "all";

// Client-side category filter + search (a simple in-memory filter is enough
// at single-restaurant menu sizes — docs/site-sections-and-features.md §2).
// The selected category mirrors ?category=<id> so home-page chips deep-link.
type Props = { categories: Category[]; items: MenuDish[] };

// Reads ?category= — must render inside <Suspense> (see menu/page.tsx).
export function MenuBrowserFromUrl(props: Props) {
  const initial = useSearchParams().get("category");
  return <MenuBrowser {...props} initialCategory={initial} />;
}

export function MenuBrowser({
  categories,
  items,
  initialCategory = null,
}: Props & { initialCategory?: string | null }) {
  const [category, setCategory] = useState(
    initialCategory && categories.some((c) => c.id === initialCategory) ? initialCategory : ALL,
  );
  const [query, setQuery] = useState("");

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  function selectCategory(id: string) {
    setCategory(id);
    const url = new URL(window.location.href);
    if (id === ALL) url.searchParams.delete("category");
    else url.searchParams.set("category", id);
    window.history.replaceState(null, "", url);
  }

  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (i) =>
      (category === ALL || i.category_id === category) &&
      (!q ||
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)),
  );

  // "All" with no search: grouped by category in the admin's order.
  const grouped = category === ALL && !q;
  const sections = grouped
    ? [
        ...categories.map((c) => ({
          id: c.id,
          title: c.name,
          items: filtered.filter((i) => i.category_id === c.id),
        })),
        { id: "other", title: "More dishes", items: filtered.filter((i) => !i.category_id) },
      ].filter((s) => s.items.length > 0)
    : [{ id: "results", title: null, items: filtered }];

  const field =
    "w-full rounded-btn border border-secondary/15 bg-white py-3 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary";

  return (
    <div className="flex flex-col gap-6">
      {/* Search + full-width category dropdown (client: better than chips on phones). */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="relative">
          <span className="sr-only">Search the menu</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            className={`${field} pr-4 pl-10`}
          />
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary/60" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </label>
        {categories.length > 0 && (
          <label className="relative">
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(e) => selectCategory(e.target.value)}
              className={`${field} cursor-pointer appearance-none pr-10 pl-4 font-medium text-secondary`}
            >
              <option value={ALL}>All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-secondary" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </label>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-secondary/20 p-10 text-center text-neutral-dark/65">
          {items.length === 0
            ? "The menu is being prepared — check back soon."
            : "No dishes match that. Try another search or category."}
        </p>
      ) : (
        sections.map((section, sectionIndex) => (
          <section key={section.id} aria-labelledby={section.title ? `menu-${section.id}` : undefined} className="flex flex-col gap-4">
            {section.title && (
              <h2 id={`menu-${section.id}`} className="font-display text-2xl font-semibold text-secondary">
                {section.title}
              </h2>
            )}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map((item, i) => (
                <li key={item.id}>
                  <MenuItemCard
                    item={item}
                    categoryName={item.category_id ? categoryName.get(item.category_id) : null}
                    priority={sectionIndex === 0 && i < 4}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
