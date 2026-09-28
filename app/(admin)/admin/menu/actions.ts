"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { emptyToNull, formValues, type FormState } from "@/lib/form-state";
import { storagePathFromUrl } from "@/lib/storage/images";
import { removeStoredImage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/server";

// Every action re-checks staff access (server actions are public endpoints)
// and writes through the user's session client, so RLS is a second gate.

// Naira amount from a form string. Not z.coerce: that would turn "" into 0.
const money = z
  .string()
  .trim()
  .min(1, "Required")
  .transform(Number)
  .pipe(
    z
      .number({ error: "Enter a number" })
      .min(0, "Can't be negative")
      .max(10_000_000, "That's too high")
      .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, "At most 2 decimal places"),
  );

const menuItemSchema = z
  .object({
    id: z.uuid().nullable(),
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().trim().max(1000).nullable(),
    price: money,
    compare_at_price: money.nullable(),
    badge: z.enum(["New", "Bestseller"]).nullable(),
    featured_order: z
      .string()
      .regex(/^\d{1,2}$/, "Use a whole number from 1 to 99")
      .transform(Number)
      .pipe(z.number().int().min(1, "Use a whole number from 1 to 99").max(99))
      .nullable(),
    category_id: z.uuid().nullable(),
    is_available: z.boolean(),
    image_url: z
      .string()
      .nullable()
      .refine(
        (url) => url === null || storagePathFromUrl(url, "menu-items") !== null,
        "Invalid image",
      ),
  })
  .refine((v) => v.compare_at_price === null || v.compare_at_price > v.price, {
    path: ["compare_at_price"],
    message: "Original price must be higher than the current price",
  });

const MENU_ITEM_FIELDS = [
  "name",
  "description",
  "price",
  "compare_at_price",
  "badge",
  "featured_order",
  "category_id",
  "is_available",
  "image_url",
] as const;

const sizeFieldNames = (formData: FormData) =>
  [...formData.keys()].filter((k) => k.startsWith("size_price:"));

function revalidateMenu() {
  revalidatePath("/admin/menu");
  // Storefront menu pages (step 2) read the same data.
  revalidatePath("/", "layout");
}

export async function saveMenuItem(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/menu");

  const parsed = menuItemSchema.safeParse({
    id: emptyToNull(formData.get("id")),
    name: formData.get("name") ?? "",
    description: emptyToNull(formData.get("description")),
    price: String(formData.get("price") ?? ""),
    compare_at_price: emptyToNull(formData.get("compare_at_price")),
    badge: emptyToNull(formData.get("badge")),
    featured_order: emptyToNull(formData.get("featured_order")),
    category_id: emptyToNull(formData.get("category_id")),
    is_available: formData.get("is_available") === "on",
    image_url: emptyToNull(formData.get("image_url")),
  });
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: formValues(formData, MENU_ITEM_FIELDS),
    };
  }

  // Bowl-size prices: one optional "size_price:<sizeId>" field per size.
  const sizePrices: { size_id: string; price: number }[] = [];
  const sizeErrors: string[] = [];
  for (const [field, raw] of formData.entries()) {
    if (!field.startsWith("size_price:")) continue;
    const text = String(raw).trim();
    if (text === "") continue;
    const sizeId = z.uuid().safeParse(field.slice("size_price:".length));
    const price = money.safeParse(text);
    if (!sizeId.success || !price.success || price.data <= 0) sizeErrors.push(text);
    else sizePrices.push({ size_id: sizeId.data, price: price.data });
  }
  if (sizeErrors.length > 0) {
    return {
      fieldErrors: { sizes: ["Bowl size prices must be amounts above 0, e.g. 3500"] },
      values: formValues(formData, [...MENU_ITEM_FIELDS, ...sizeFieldNames(formData)]),
    };
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  let previousImageUrl: string | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from("menu_items")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();
    previousImageUrl = existing?.image_url ?? null;
  }

  const { data: saved, error } = id
    ? await supabase.from("menu_items").update(values).eq("id", id).select("id").single()
    : await supabase.from("menu_items").insert(values).select("id").single();

  if (!error && saved) {
    const { error: sizesError } = await supabase.rpc("set_menu_item_sizes", {
      p_menu_item_id: saved.id,
      p_prices: sizePrices,
    });
    if (sizesError) {
      console.error("set_menu_item_sizes failed:", sizesError.code, sizesError.message);
      return {
        error: "Saved the dish, but couldn't save its bowl size prices. Please try again.",
        values: formValues(formData, [...MENU_ITEM_FIELDS, ...sizeFieldNames(formData)]),
      };
    }
  }

  if (error) {
    console.error("saveMenuItem failed:", error.code, error.message);
    return {
      error: "Couldn't save this item. Please try again.",
      values: formValues(formData, MENU_ITEM_FIELDS),
    };
  }

  if (previousImageUrl !== values.image_url) {
    await removeStoredImage(supabase, previousImageUrl, "menu-items");
  }

  revalidateMenu();
  redirect("/admin/menu");
}

const idSchema = z.uuid();

export async function deleteMenuItem(formData: FormData) {
  await requireStaff("/admin/menu");
  const id = idSchema.parse(formData.get("id"));

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .select("image_url")
    .maybeSingle();
  if (error) throw new Error("Couldn't delete this item.");

  await removeStoredImage(supabase, deleted?.image_url, "menu-items");
  revalidateMenu();
}

export async function setMenuItemAvailability(formData: FormData) {
  await requireStaff("/admin/menu");
  const id = idSchema.parse(formData.get("id"));
  const isAvailable = formData.get("is_available") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", id);
  if (error) throw new Error("Couldn't update availability.");

  revalidateMenu();
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categoryNameSchema = z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters");

function categoryError(code: string | undefined): FormState {
  if (code === "23505") return { error: "A category with that name already exists." };
  return { error: "Couldn't save the category. Please try again." };
}

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/menu");
  const name = categoryNameSchema.safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("categories")
    .insert({ name: name.data, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return categoryError(error.code);

  revalidateMenu();
  return { ok: true };
}

export async function renameCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/menu");
  const id = idSchema.safeParse(formData.get("id"));
  const name = categoryNameSchema.safeParse(formData.get("name") ?? "");
  if (!id.success) return { error: "Unknown category." };
  if (!name.success) return { error: name.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name: name.data }).eq("id", id.data);
  if (error) return categoryError(error.code);

  revalidateMenu();
  return { ok: true };
}

export async function deleteCategory(formData: FormData) {
  await requireStaff("/admin/menu");
  const id = idSchema.parse(formData.get("id"));

  // Items in this category become uncategorised (FK is ON DELETE SET NULL).
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete the category.");

  revalidateMenu();
}

export async function moveCategory(formData: FormData) {
  await requireStaff("/admin/menu");
  const id = idSchema.parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));

  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, sort_order")
    .order("sort_order")
    .order("name");
  if (error || !categories) throw new Error("Couldn't load categories.");

  const from = categories.findIndex((c) => c.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= categories.length) return;

  const reordered = [...categories];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];

  // Renumber 0..n-1 so ties from older data can't make a move a no-op.
  const updates = reordered
    .map((c, index) => ({ id: c.id, sort_order: index, changed: c.sort_order !== index }))
    .filter((c) => c.changed);
  for (const u of updates) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ sort_order: u.sort_order })
      .eq("id", u.id);
    if (updateError) throw new Error("Couldn't reorder categories.");
  }

  revalidateMenu();
}

// ---------------------------------------------------------------------------
// Bowl sizes (client, 2026-09-28): one shared list; each dish sets a price
// per size it comes in (dish form). Deleting a size removes its prices.
// ---------------------------------------------------------------------------

const sizeNameSchema = z.string().trim().min(1, "Name is required").max(40, "Keep it under 40 characters");

function sizeError(code: string | undefined): FormState {
  if (code === "23505") return { error: "A bowl size with that name already exists." };
  return { error: "Couldn't save the bowl size. Please try again." };
}

export async function createBowlSize(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/menu");
  const name = sizeNameSchema.safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("bowl_sizes")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("bowl_sizes")
    .insert({ name: name.data, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return sizeError(error.code);

  revalidateMenu();
  return { ok: true };
}

export async function renameBowlSize(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("/admin/menu");
  const id = idSchema.safeParse(formData.get("id"));
  const name = sizeNameSchema.safeParse(formData.get("name") ?? "");
  if (!id.success) return { error: "Unknown bowl size." };
  if (!name.success) return { error: name.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("bowl_sizes").update({ name: name.data }).eq("id", id.data);
  if (error) return sizeError(error.code);

  revalidateMenu();
  return { ok: true };
}

export async function deleteBowlSize(formData: FormData) {
  await requireStaff("/admin/menu");
  const id = idSchema.parse(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("bowl_sizes").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete the bowl size.");
  revalidateMenu();
}

export async function moveBowlSize(formData: FormData) {
  await requireStaff("/admin/menu");
  const id = idSchema.parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));

  const supabase = await createClient();
  const { data: sizes, error } = await supabase.from("bowl_sizes").select("id, sort_order").order("sort_order").order("name");
  if (error || !sizes) throw new Error("Couldn't load bowl sizes.");

  const from = sizes.findIndex((s) => s.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= sizes.length) return;
  const reordered = [...sizes];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];

  for (const [index, size] of reordered.entries()) {
    if (size.sort_order === index) continue;
    const { error: updateError } = await supabase.from("bowl_sizes").update({ sort_order: index }).eq("id", size.id);
    if (updateError) throw new Error("Couldn't reorder bowl sizes.");
  }
  revalidateMenu();
}
