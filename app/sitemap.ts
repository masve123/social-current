import type { MetadataRoute } from "next";
import { articles } from "@/lib/articles";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/services", "/instagram-growth", "/tiktok-growth", "/youtube-growth", "/about", "/blog", "/editorial-policy", "/faq", "/contact", "/privacy", "/terms", "/refund-policy"];
  return [
    ...staticPages.map((path) => ({ url: `${site.url}${path}`, lastModified: new Date("2026-10-02"), changeFrequency: path === "" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : 0.6 })),
    ...services.map((service) => ({ url: `${site.url}/services/${service.slug}`, lastModified: new Date("2026-10-02"), changeFrequency: "weekly" as const, priority: 0.9 })),
    ...articles.map((article) => ({ url: `${site.url}/blog/${article.slug}`, lastModified: new Date(article.updated), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
