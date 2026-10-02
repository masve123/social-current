import type { MetadataRoute } from "next";
import { articles } from "@/lib/articles";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/services", "/instagram-growth", "/tiktok-growth", "/youtube-growth", "/about", "/blog", "/editorial-policy", "/faq", "/contact", "/privacy", "/terms", "/refund-policy"];
  return [
    ...staticPages.map((path) => ({ url: `${site.url}${path}` })),
    ...services.map((service) => ({ url: `${site.url}/services/${service.slug}` })),
    ...articles.map((article) => ({ url: `${site.url}/blog/${article.slug}`, lastModified: new Date(article.updated) })),
  ];
}
