import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated surfaces have nothing useful to index.
      disallow: ["/dashboard", "/session/", "/start", "/dev-chat", "/api/"],
    },
    sitemap: "https://loopready-five.vercel.app/sitemap.xml",
  };
}
