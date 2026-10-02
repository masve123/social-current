import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ServiceCard } from "@/components/service-card";
import { getArticlesByCategory } from "@/lib/articles";
import type { Platform } from "@/lib/platforms";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export function PlatformPage({ platform }: { platform: Platform }) {
  const platformServices = services.filter((service) => service.platform === platform.name);
  const guides = getArticlesByCategory(platform.name);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: platform.title,
      description: platform.description,
      url: `${site.url}/${platform.slug}-growth`,
      isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${platform.name} services`,
      itemListElement: platformServices.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${site.url}/services/${service.slug}`,
        name: service.title,
      })),
    },
  ];

  return (
    <>
      <section className={`platform-hero platform-hero--${platform.color}`}>
        <div className="shell">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: platform.title }]} />
          <span className="eyebrow">{platform.name} growth</span>
          <h1>{platform.title.split(" ").slice(0, -1).join(" ")} <em>{platform.title.split(" ").at(-1)}.</em></h1>
          <p>{platform.intro}</p>
          <Link className="button button--ink" href="#services">Compare services <ArrowRight /></Link>
        </div>
      </section>

      <section className="section shell" id="services">
        <div className="section-heading">
          <div><span className="eyebrow">Choose your goal</span><h2>{platform.name} packages with <em>clear terms.</em></h2></div>
          <p>Each service has its own delivery range, limits, and support details. Compare them before moving to checkout.</p>
        </div>
        <div className={`services-grid services-grid--${platformServices.length}`}>
          {platformServices.map((service) => <ServiceCard service={service} key={service.slug} />)}
        </div>
      </section>

      <section className="section section--tinted">
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow">A stronger campaign</span><h2>Prepare before you <em>promote.</em></h2></div><p>Visible metrics work better when the profile, content, and audience journey already make sense.</p></div>
          <div className="principles-grid">
            {platform.principles.map((principle, index) => <article key={principle.title}><span>0{index + 1}</span><CheckCircle2 /><h3>{principle.title}</h3><p>{principle.text}</p></article>)}
          </div>
        </div>
      </section>

      {guides.length > 0 && <section className="section shell"><div className="section-heading"><div><span className="eyebrow">Learn the platform</span><h2>{platform.name} growth <em>guides.</em></h2></div><Link className="text-link text-link--arrow" href="/blog">All growth notes <ArrowRight /></Link></div><div className="resource-list">{guides.map((article) => <Link href={`/blog/${article.slug}`} key={article.slug}><span>{article.category} · {article.readTime}</span><strong>{article.title}</strong><ArrowRight /></Link>)}</div></section>}
      <JsonLd data={schema} />
    </>
  );
}
