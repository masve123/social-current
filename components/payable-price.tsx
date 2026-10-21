"use client";
import { usePaymentMinimum } from "@/lib/use-payment-minimum";
import { getCheckoutMinimumQuantity } from "@/lib/checkout-pricing";
import { calculateOfferPrice, getServiceOffers } from "@/lib/smm-offers";
import type { Service } from "@/lib/services";
export function PayablePrice({service}:{service:Service}) {
  const quote = usePaymentMinimum("usdtbsc");
  const offer = getServiceOffers(service)[0];
  if (!quote) return <span>Checking price…</span>;
  if (!quote.minimum) return <span>See payment availability</span>;
  const quantity = getCheckoutMinimumQuantity(service,offer,Math.max(4.99,quote.minimum));
  const price = calculateOfferPrice(service,quantity,offer);
  if (Number(price.toFixed(2)) < quote.minimum) return <span>See available packages</span>;
  return <span>${price.toFixed(2)}</span>;
}
