import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's own dev-mode badge defaults to the bottom-left corner, which is
  // exactly where the sidebar's account/Log out block now permanently sits
  // -- the two visibly collide in local dev only (confirmed absent from
  // production builds, where this indicator never renders).
  devIndicators: false,
  images: {
    // UI screenshots show compression artifacts around text at the default
    // quality of 75, so allow a high-quality tier for them.
    qualities: [75, 95],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
