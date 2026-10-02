import type { Metadata } from "next";
import { site } from "@/lib/site";

export function pageSocialMetadata(title: string, description: string, path: string): Metadata {
  return {
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: site.name,
      title,
      description,
      url: `${site.url}${path}`,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name} social media growth services` }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}
