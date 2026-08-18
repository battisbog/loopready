import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated surfaces have nothing useful to index.
      disallow: ["/dashboard", "/session/", "/start", "/dev-chat", "/dev-ring", "/admin", "/api/"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
