"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Category, MenuItem } from "@/lib/supabase/types";
import { MenuItemCard } from "./menu-item-card";

const ALL = "all";

// Client-side category filter + search (a simple in-memory filter is enough
// at single-restaurant menu sizes — docs/site-sections-and-features.md §2).
// The selected category mirrors ?category=<id> so home-page chips deep-link.
type Props = { categories: Category[]; items: MenuItem[] };

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

  const chip = (active: boolean) =>
    `shrink-0 rounded-btn px-4 py-2 text-sm font-medium transition ${
      active
        ? "bg-secondary text-white shadow"
        : "bg-white text-secondary ring-1 ring-secondary/15 hover:bg-primary/40"
    }`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative sm:max-w-xs sm:flex-1">
          <span className="sr-only">Search the menu</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            className="w-full rounded-btn border border-secondary/15 bg-white py-2.5 pr-4 pl-10 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary sm:text-sm"
          />
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary/60" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </label>
        {categories.length > 0 && (
          <div
            role="group"
            aria-label="Filter by category"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            <button type="button" aria-pressed={category === ALL} onClick={() => selectCategory(ALL)} className={chip(category === ALL)}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => selectCategory(c.id)}
                className={chip(category === c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
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
