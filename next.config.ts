import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "framer-motion"],
  },
  async redirects() {
    return [
      // Variant routes are gone — anyone visiting them lands on the canonical site.
      { source: "/v/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
