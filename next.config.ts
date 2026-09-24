import type { NextConfig } from "next";

// Images live in the Supabase Storage `images` bucket; next/image (Netlify
// Image CDN in production) resizes them, so allow only that bucket's public path.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
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
