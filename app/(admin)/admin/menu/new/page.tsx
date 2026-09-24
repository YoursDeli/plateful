import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MenuItemForm } from "../menu-item-form";

export const metadata: Metadata = { title: "Add menu item" };

export default async function NewMenuItemPage() {
  await requireStaff("/admin/menu/new");
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw new Error("Couldn't load categories.");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Add menu item</h1>
      <MenuItemForm categories={categories} />
    </div>
  );
}
