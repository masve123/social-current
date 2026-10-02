import { calculateOfferPrice, getServiceOffers, type SmmOffer } from "@/lib/smm-offers";
import type { Service } from "@/lib/services";

// The advertised minimum package price. Provider fees are paid from our proceeds.
export const minimumCheckoutUsd = 4.99;

export function getCheckoutMinimumQuantity(service: Service, offer: SmmOffer) {
  const step = offer.step ?? service.step;
  const min = Math.ceil((offer.min ?? service.min) / step) * step;
  const max = offer.max ?? service.max;

  for (let quantity = min; quantity <= max; quantity += step) {
    if (Math.round(calculateOfferPrice(service, quantity, offer) * 100) >= minimumCheckoutUsd * 100) {
      return quantity;
    }
  }
  return max;
}

export function getStandardCheckoutMinimumQuantity(service: Service) {
  return getCheckoutMinimumQuantity(service, getServiceOffers(service)[0]);
}
