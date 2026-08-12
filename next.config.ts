import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // UI screenshots show compression artifacts around text at the default
    // quality of 75, so allow a high-quality tier for them.
    qualities: [75, 95],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
