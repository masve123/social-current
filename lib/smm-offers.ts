import { calculatePrice, type Service } from "@/lib/services";

export type SmmOffer = {
  id: string;
  label: string;
  description: string;
  audience: string;
  quality: string;
  delivery: string;
  protection: string;
  priceMultiplier: number;
  customComments?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

const standard: SmmOffer = {
  id: "standard",
  label: "Standard",
  description: "Worldwide delivery with the strongest value.",
  audience: "Global",
  quality: "Standard",
  delivery: "Regular",
  protection: "Service dependent",
  priceMultiplier: 1,
};

const premium: SmmOffer = {
  id: "premium",
  label: "Premium",
  description: "Higher-retention profiles with gradual delivery.",
  audience: "Global",
  quality: "Premium",
  delivery: "Gradual",
  protection: "30-day refill",
  priceMultiplier: 1.45,
};

const usa: SmmOffer = {
  id: "usa",
  label: "USA targeted",
  description: "A country-targeted service mapped to US profiles.",
  audience: "United States",
  quality: "Targeted",
  delivery: "Gradual",
  protection: "30-day refill",
  priceMultiplier: 1.85,
};

const usaFemale: SmmOffer = {
  ...usa,
  id: "usa-female",
  label: "USA female",
  description: "US-targeted female profiles with slower delivery.",
  quality: "Targeted female",
  priceMultiplier: 6,
  max: 30000,
};

const usaMale: SmmOffer = {
  ...usa,
  id: "usa-male",
  label: "USA male",
  description: "US-targeted male profiles with slower delivery.",
  quality: "Targeted male",
  priceMultiplier: 6,
  max: 6000,
};

const usaEurope: SmmOffer = {
  ...usa,
  id: "usa-europe",
  label: "US & Europe",
  description: "Engagement from a mixed US and European audience.",
  audience: "US & Europe",
  priceMultiplier: 1.85,
};

const europe: SmmOffer = {
  id: "europe",
  label: "Europe targeted",
  description: "A regional service mapped to European profiles.",
  audience: "Europe",
  quality: "Targeted",
  delivery: "Gradual",
  protection: "30-day refill",
  priceMultiplier: 1.7,
};

const highRetention: SmmOffer = {
  id: "high-retention",
  label: "High retention",
  description: "Slower delivery optimized for stronger retention.",
  audience: "Global",
  quality: "High retention",
  delivery: "Gradual",
  protection: "30-day refill",
  priceMultiplier: 1.4,
};

const standardComments: SmmOffer = {
  ...standard,
  id: "standard-comments",
  label: "Standard comments",
  description: "Provider-written comments for visible activity.",
  quality: "Standard comments",
};

const customComments: SmmOffer = {
  id: "custom-comments",
  label: "Your comments",
  description: "Supply one comment per line for exact wording.",
  audience: "Global",
  quality: "Custom text",
  delivery: "Gradual",
  protection: "Quality checked",
  priceMultiplier: 2.2,
  customComments: true,
};

const usaComments: SmmOffer = {
  ...usa,
  id: "usa-comments",
  label: "USA comments",
  description: "Comments delivered through a US-targeted service.",
  quality: "Country targeted",
  priceMultiplier: 2.35,
  max: 500,
};

export function getServiceOffers(service: Service): SmmOffer[] {
  switch (service.slug) {
    case "instagram-followers": return [{ ...standard, protection: "30-day refill" }, { ...premium, max: 20000 }, usaFemale, usaMale, { ...europe, max: 2000 }];
    case "instagram-likes": return [standard, premium, usaEurope];
    case "instagram-views": return [standard];
    case "instagram-comments": return [standardComments, customComments, usaComments];
    case "tiktok-followers": return [standard, { ...premium, max: 7500 }];
    case "tiktok-likes": return [standard, premium];
    case "tiktok-views": return [standard];
    case "tiktok-comments": return [standardComments, customComments];
    case "youtube-subscribers": return [{ ...standard, protection: "No refill" }, { ...premium, max: 10000 }];
    case "youtube-likes": return [standard, premium, { ...usa, max: 20000 }];
    case "youtube-views": return [standard, highRetention, { ...usa, min: 1000, max: 100000 }];
    case "youtube-comments": return [standardComments, customComments, { ...usaComments, max: 2000 }];
    default: return [standard];
  }
}

export function getServiceOffer(service: Service, offerId?: string) {
  const offers = getServiceOffers(service);
  return offers.find((offer) => offer.id === offerId) || offers[0];
}

export function calculateOfferPrice(service: Service, quantity: number, offer: SmmOffer) {
  return calculatePrice(service, quantity) * offer.priceMultiplier;
}
