import { notFound, permanentRedirect } from "next/navigation";
import { servicePath } from "@/lib/service-path";
import { getService, services } from "@/lib/services";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export default async function LegacyServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const service = getService((await params).slug);
  if (!service) notFound();
  permanentRedirect(servicePath(service));
}
