import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ServiceCard } from "@/components/service-card";
import { platforms } from "@/lib/platforms";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social Media Growth Services and Packages",
  description: "Compare Instagram, TikTok, and YouTube growth services with clear prices, delivery windows, and package terms.",
  alternates: { canonical: "/services" },
  openGraph: { title: "Social Media Growth Services", description: "Compare all Social Current social media growth packages.", url: `${site.url}/services` },
};

export default function ServicesPage() {
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", name: "Social Current social media growth services", itemListElement: services.map((service, index) => ({ "@type": "ListItem", position: index + 1, name: service.title, url: `${site.url}/services/${service.slug}` })) };
  return (
    <>
      <section className="page-hero page-hero--compact"><div className="shell"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Services" }]} /><span className="eyebrow">All services</span><h1>Choose the signal you want to <em>strengthen.</em></h1><p>Compare every package by platform, delivery time, quantity, and refill coverage before checkout.</p></div></section>
      {platforms.map((platform) => { const items = services.filter((service) => service.platform === platform.name); return <section className="section shell service-group" key={platform.slug}><div className="service-group__heading"><div><span className="eyebrow">{platform.name}</span><h2>{platform.name} growth services</h2></div><Link className="text-link text-link--arrow" href={`/${platform.slug}-growth`}>Platform guide <ArrowRight /></Link></div><div className={`services-grid services-grid--${items.length}`}>{items.map((service) => <ServiceCard service={service} key={service.slug} />)}</div></section>; })}
      <JsonLd data={itemList} />
    </>
  );
}
