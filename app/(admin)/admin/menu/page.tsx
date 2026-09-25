import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Category, MenuItem } from "@/lib/supabase/types";
import { deleteMenuItem, setMenuItemAvailability } from "./actions";
import { CategoriesPanel } from "./categories-panel";

export const metadata: Metadata = { title: "Food Menu" };

export default async function AdminMenuPage() {
  await requireStaff("/admin/menu");
  const supabase = await createClient();

  const [{ data: categories, error: catError }, { data: items, error: itemError }] =
    await Promise.all([
      supabase.from("categories").select("*").order("sort_order").order("name"),
      supabase.from("menu_items").select("*").order("name"),
    ]);
  if (catError || itemError) throw new Error("Couldn't load the menu.");

  const groups: { category: Category | null; items: MenuItem[] }[] = [
    ...categories.map((category) => ({
      category,
      items: items.filter((i) => i.category_id === category.id),
    })),
    { category: null, items: items.filter((i) => i.category_id === null) },
  ].filter((g) => g.category !== null || g.items.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Food Menu</h1>
        <Link
          href="/admin/menu/new"
          className="rounded-btn bg-primary px-4 py-2 text-sm font-medium text-secondary"
        >
          + Add item
        </Link>
      </div>

      <CategoriesPanel categories={categories} />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-dark/20 p-6 text-center text-sm text-neutral-dark/60">
          No menu items yet. Add your first dish to get started.
        </p>
      ) : (
        groups.map(({ category, items: groupItems }) => (
          <section key={category?.id ?? "uncategorised"} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-dark/60">
              {category?.name ?? "Uncategorised"}{" "}
              <span className="font-normal">({groupItems.length})</span>
            </h2>
            {groupItems.length === 0 ? (
              <p className="text-sm text-neutral-dark/50">No items in this category.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {groupItems.map((item) => (
                  <MenuItemRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}

function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-white card-accent p-3 shadow-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-neutral-light">
          {item.image_url && (
            <Image src={item.image_url} alt="" fill sizes="64px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{item.name}</span>
            {item.badge && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-secondary">
                {item.badge}
              </span>
            )}
            {item.featured_order !== null && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-white">
                Hero #{item.featured_order}
              </span>
            )}
            {!item.is_available && (
              <span className="rounded-full bg-neutral-dark/10 px-2 py-0.5 text-xs">Unavailable</span>
            )}
          </p>
          <p className="text-sm">
            <strong>{formatNaira(item.price)}</strong>
            {item.compare_at_price !== null && (
              <s className="ml-2 text-neutral-dark/50">{formatNaira(item.compare_at_price)}</s>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <form action={setMenuItemAvailability}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="is_available" value={String(!item.is_available)} />
          <button type="submit" className="rounded-btn border border-neutral-dark/20 px-3 py-1.5">
            {item.is_available ? "Mark unavailable" : "Mark available"}
          </button>
        </form>
        <Link
          href={`/admin/menu/${item.id}`}
          className="rounded-btn bg-secondary px-3 py-1.5 text-white"
        >
          Edit
        </Link>
        <form action={deleteMenuItem}>
          <input type="hidden" name="id" value={item.id} />
          <ConfirmSubmitButton
            message={`Delete "${item.name}"? This can't be undone.`}
            className="rounded-btn px-3 py-1.5 text-red-700 hover:bg-red-50"
          >
            Delete
          </ConfirmSubmitButton>
        </form>
      </div>
    </li>
  );
}
