import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { IMAGES_BUCKET, storagePathFromUrl, type ImageFolder } from "./images";

// Best-effort delete of an image we no longer reference (replaced, removed,
// or its menu item deleted). Never fails the calling action — a leftover file
// only costs a little storage.
export async function removeStoredImage(
  supabase: SupabaseClient<Database>,
  url: string | null | undefined,
  folder: ImageFolder,
) {
  if (!url) return;
  const path = storagePathFromUrl(url, folder);
  if (!path) return;
  const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
  if (error) console.error("removeStoredImage failed:", path, error.message);
}
