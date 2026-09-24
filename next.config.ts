import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the user's home dir otherwise makes Turbopack
  // infer the wrong workspace root.
  turbopack: { root: __dirname },
};

export default nextConfig;
