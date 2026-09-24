// Shared by the upload field (client) and server actions. Mirrors
// supabase/migrations/20260924000000_storage_images.sql — keep them in sync.

export const IMAGES_BUCKET = "images";

export const IMAGE_FOLDERS = ["menu-items", "branding", "pages"] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function publicPrefix() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${IMAGES_BUCKET}/` : null;
}

export function publicImageUrl(path: string) {
  const prefix = publicPrefix();
  if (!prefix) throw new Error("Supabase is not configured");
  return prefix + path.split("/").map(encodeURIComponent).join("/");
}

// Object path (e.g. "menu-items/abc.jpg") for a URL we issued, or null if the
// URL isn't a public URL in our own bucket + the expected folder. Used to
// reject tampered form values and to find old files to clean up.
export function storagePathFromUrl(url: string, folder: ImageFolder): string | null {
  const prefix = publicPrefix();
  if (!prefix) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const expected = new URL(prefix);
  if (parsed.origin !== expected.origin || parsed.search || parsed.hash) return null;
  // URL parsing has already resolved any "../" segments at this point.
  if (!parsed.pathname.startsWith(`${expected.pathname}${folder}/`)) return null;

  const path = decodeURIComponent(parsed.pathname.slice(expected.pathname.length));
  return /^[a-z-]+\/[\w.-]+$/.test(path) ? path : null;
}
