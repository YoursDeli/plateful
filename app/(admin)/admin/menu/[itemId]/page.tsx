import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MenuItemForm } from "../menu-item-form";

export const metadata: Metadata = { title: "Edit menu item" };

export default async function EditMenuItemPage({ params }: PageProps<"/admin/menu/[itemId]">) {
  const { itemId } = await params;
  await requireStaff(`/admin/menu/${itemId}`);
  if (!z.uuid().safeParse(itemId).success) notFound();

  const supabase = await createClient();
  const [{ data: item }, { data: categories, error }] = await Promise.all([
    supabase.from("menu_items").select("*").eq("id", itemId).maybeSingle(),
    supabase.from("categories").select("*").order("sort_order").order("name"),
  ]);
  if (error) throw new Error("Couldn't load categories.");
  if (!item) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">
        Edit {item.name}
      </h1>
      <MenuItemForm item={item} categories={categories} />
    </div>
  );
}
