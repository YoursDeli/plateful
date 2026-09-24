// Shared by the sign route (server) and the upload field (client).
export const UPLOAD_FOLDERS = ["menu-items", "branding", "pages"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
