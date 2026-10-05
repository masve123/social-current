import { getService, services, type Service } from "@/lib/services";

const publicSlugOverrides: Record<string, string> = {
  "instagram-views": "instagram-reels-views",
};

export function getServicePublicSlug(service: Service) {
  return publicSlugOverrides[service.slug] || service.slug;
}

export function servicePath(service: Service) {
  return `/${getServicePublicSlug(service)}`;
}

export function getServiceByPublicSlug(slug: string) {
  const service = services.find((item) => getServicePublicSlug(item) === slug);
  return service || getService(slug);
}

