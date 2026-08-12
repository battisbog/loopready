import type { MetadataRoute } from "next";

const BASE = "https://loopready-five.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
