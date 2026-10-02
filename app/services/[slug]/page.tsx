import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PackagePicker } from "@/components/package-picker";
import { getArticlesByCategory } from "@/lib/articles";
import { getPlatform } from "@/lib/platforms";
import { serviceContent } from "@/lib/service-content";
import { calculatePrice, getService, services } from "@/lib/services";
import { getStandardCheckoutMinimumQuantity } from "@/lib/checkout-pricing";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const service = getService((await params).slug);
  if (!service) return {};
  const title = `${service.title} — Fast, Clear Delivery`;
  return {
    title,
    description: service.description,
    keywords: [service.title, `${service.platform} ${service.metric}`, `${service.metric} packages`, `${service.platform} growth`],
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: { title, description: service.description, url: `${site.url}/services/${service.slug}` },
    twitter: { card: "summary_large_image", title, description: service.description },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const service = getService((await params).slug);
  if (!service) notFound();
  const platform = getPlatform(service.platform.toLowerCase());
  const guides = getArticlesByCategory(service.platform).slice(0, 3);
  const content = serviceContent[service.slug];
  const checkoutMin = getStandardCheckoutMinimumQuantity(service);
  const startingQuantity = Math.max(service.baseQuantity, checkoutMin);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: service.title,
    description: service.description,
    category: `${service.platform} growth services`,
    url: `${site.url}/services/${service.slug}`,
    image: `${site.url}/opengraph-image`,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: calculatePrice(service, checkoutMin).toFixed(2),
      highPrice: calculatePrice(service, service.max).toFixed(2),
      offerCount: Math.floor((service.max - checkoutMin) / service.step) + 1,
      availability: "https://schema.org/InStock",
      url: `${site.url}/services/${service.slug}`,
    },
  };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: service.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };

  return (
    <>
      <section className={`service-hero service-hero--${service.color}`}>
        <div className="shell"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, ...(platform ? [{ label: platform.title, href: `/${platform.slug}-growth` }] : []), { label: service.title }]} /></div>
        <div className="shell service-hero__grid">
          <div>
            <span className="pill"><span /> {service.eyebrow}</span>
            <h1>{service.title.split(" ").slice(0, -1).join(" ")} <em>{service.title.split(" ").at(-1)}.</em></h1>
            <p>{service.description}</p>
            <ul className="check-list">
              {service.highlights.map((item) => <li key={item}><Check />{item}</li>)}
            </ul>
          </div>
          <PackagePicker service={service} />
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell">
          <span><ShieldCheck /> No password required</span>
          <span><Sparkles /> Clear progress updates</span>
          <span><Check /> Support if you need it</span>
        </div>
      </section>

      <section className="section shell seo-content">
        <div>
          <span className="eyebrow">Built for better first impressions</span>
          <h2>{content.heading}</h2>
        </div>
        <div className="prose">
          {content.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {content.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.text}</p></section>)}
        </div>
      </section>

      <section className="section section--tinted">
        <div className="shell faq-section">
          <div><span className="eyebrow">Before you order</span><h2>{service.platform} {service.metric}, <em>explained.</em></h2><p>Clear answers about delivery, account access, and package limits.</p></div>
          <FaqList items={service.faq} />
        </div>
      </section>

      {guides.length > 0 && <section className="section shell"><div className="section-heading"><div><span className="eyebrow">Plan the campaign</span><h2>Useful {service.platform} growth <em>guides.</em></h2></div><Link className="text-link text-link--arrow" href="/blog">All growth notes <ArrowRight /></Link></div><div className="resource-list">{guides.map((article) => <Link href={`/blog/${article.slug}`} key={article.slug}><span>{article.category} · {article.readTime}</span><strong>{article.title}</strong><ArrowRight /></Link>)}</div></section>}

      <section className="mini-cta"><div className="shell"><div><span>Ready to move?</span><h2>Start with {startingQuantity.toLocaleString()} {service.metric}.</h2></div><Link className="button button--cream" href={`/order?service=${service.slug}&quantity=${startingQuantity}`}>Continue — ${calculatePrice(service, startingQuantity).toFixed(2)} <ArrowRight /></Link></div></section>
      <JsonLd data={[productSchema, faqSchema]} />
    </>
  );
}
