import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Service } from "@/lib/services";

export function ServiceCard({ service, featured = false }: { service: Service; featured?: boolean }) {
  return (
    <article className={`service-card service-card--${service.color} ${featured ? "service-card--featured" : ""}`}>
      <div className="service-card__topline">
        <span>{service.eyebrow}</span>
        <ArrowUpRight aria-hidden="true" />
      </div>
      <h3>{service.shortTitle}</h3>
      <p>{service.description}</p>
      <div className="service-card__price">
        <span>from</span>
        <strong>${service.basePrice.toFixed(2)}</strong>
      </div>
      <ul>
        {service.highlights.map((item) => <li key={item}><Check aria-hidden="true" /> {item}</li>)}
      </ul>
      <Link className="card-link" href={`/services/${service.slug}`} aria-label={`View ${service.shortTitle} packages`}>
        View packages <ArrowUpRight aria-hidden="true" />
      </Link>
    </article>
  );
}
