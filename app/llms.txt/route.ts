import { articles } from "@/lib/articles";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const body = `# ${site.name}

> ${site.description}

${site.name} provides clearly priced social media growth packages. No password is requested. Delivery estimates and refill terms are shown on each service page. Platform outcomes such as reach, ranking, or sales are not guaranteed.

## Main pages
- [Services](${site.url}/services)
- [Instagram growth](${site.url}/instagram-growth)
- [TikTok growth](${site.url}/tiktok-growth)
- [YouTube growth](${site.url}/youtube-growth)
- [Growth notes](${site.url}/blog)
- [FAQ](${site.url}/faq)

## Services
${services.map((service) => `- [${service.title}](${site.url}/services/${service.slug}): ${service.description}`).join("\n")}

## Guides
${articles.map((article) => `- [${article.title}](${site.url}/blog/${article.slug}): ${article.description}`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
