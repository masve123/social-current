import { getStandardCheckoutMinimumQuantity } from "@/lib/checkout-pricing";
import { calculatePrice } from "@/lib/services";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceLandingPage } from "@/components/service-landing-page";
import { getServiceByPublicSlug, getServicePublicSlug, servicePath } from "@/lib/service-path";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((service) => ({ serviceSlug: getServicePublicSlug(service) }));
}

export async function generateMetadata({ params }: { params: Promise<{ serviceSlug: string }> }): Promise<Metadata> {
  const service = getServiceByPublicSlug((await params).serviceSlug);
  if (!service) return {};
  const path = servicePath(service);
  const title = `${service.title} — Packages from $${calculatePrice(service, getStandardCheckoutMinimumQuantity(service)).toFixed(2)}`;
  return {
    title,
    description: `${service.description} Compare package types, quantities, delivery estimates, and protection before ordering.`,
    keywords: [service.title, `${service.platform} ${service.metric}`, `${service.metric} packages`, `${service.platform} growth`],
    alternates: { canonical: path },
    openGraph: { title, description: service.description, url: `${site.url}${path}` },
    twitter: { card: "summary_large_image", title, description: service.description },
  };
}

export default async function PublicServicePage({ params }: { params: Promise<{ serviceSlug: string }> }) {
  const service = getServiceByPublicSlug((await params).serviceSlug);
  if (!service) notFound();
  return <ServiceLandingPage service={service} />;
}

