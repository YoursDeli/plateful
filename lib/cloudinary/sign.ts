import "server-only";
import { createHash } from "node:crypto";
import { ALLOWED_FORMATS, type UploadFolder } from "./constants";

export { UPLOAD_FOLDERS, type UploadFolder } from "./constants";

// Cloudinary has no signable max-bytes parameter, so the size limit is
// enforced client-side (UX) while this signed incoming transformation caps
// what actually gets stored. See docs/progress.md "Decisions Made During Build".
const INCOMING_TRANSFORMATION = "c_limit,w_2000,h_2000";

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

// Cloudinary signature: SHA-1 of the alphabetically sorted params
// ("k=v&k=v", excluding file/api_key/cloud_name/resource_type) + api_secret.
export function signUploadParams(folder: UploadFolder) {
  const params: Record<string, string> = {
    allowed_formats: ALLOWED_FORMATS.join(","),
    folder: `plateful/${folder}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: INCOMING_TRANSFORMATION,
  };

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");

  return {
    ...params,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY!,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}

// Only accept image URLs that point at our own Cloudinary account + folder,
// so a tampered form can't store an arbitrary external URL.
export function isOwnCloudinaryUrl(url: string, folder: UploadFolder) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloud}/image/upload/`) &&
      parsed.pathname.includes(`/plateful/${folder}/`)
    );
  } catch {
    return false;
  }
}
