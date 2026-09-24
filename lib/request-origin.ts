import "server-only";
import { headers } from "next/headers";

// This deployment's public origin (localhost, LAN IP, or the Netlify URL),
// for absolute links: Paystack callback URLs and links inside emails.
// SITE_URL, when set, wins (useful once there's a custom domain).
export async function requestOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}
