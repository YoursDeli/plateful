import type { NextConfig } from "next";

// Images live in the Supabase Storage `images` bucket; next/image (Netlify
// Image CDN in production) resizes them, so allow only that bucket's public path.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

// Security headers on every response (step 13). The Content-Security-Policy
// only allows our own origin plus Supabase (data, auth, Realtime, images).
// Paystack and Google sign-in are full-page redirects, so they need no
// entry. 'unsafe-inline' is required by Next's inline bootstrap scripts and
// the runtime theme/styled-components <style> tags — a nonce-based policy
// would force every page to render dynamically and lose static caching.
// Dev is left without a CSP (hot reload needs eval + websockets).
const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseHost ? `wss://${supabaseHost}` : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://checkout.paystack.com",
  "upgrade-insecure-requests",
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // A stray package-lock.json in the user's home dir otherwise makes Turbopack
  // infer the wrong workspace root.
  turbopack: { root: __dirname },
  // SSR-safe class names for the styled-components buttons in /components/ui.
  compiler: { styledComponents: true },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/images/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
