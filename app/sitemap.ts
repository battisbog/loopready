import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const BASE = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
