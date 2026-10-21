import type { StoredOrder } from "@/lib/order-store";
import { isPaidPaymentStatus } from "@/lib/nowpayments";
import { getService } from "@/lib/services";
import { getServiceOffers } from "@/lib/smm-offers";

export function orderCapabilities(order: StoredOrder) {
  const service = getService(order.service_slug);
  const offer = service && getServiceOffers(service).find((item) => item.id === order.offer_id);
  const active = Boolean(offer && order.provider && order.provider_order_id && isPaidPaymentStatus(order.payment_status));
  const protection = offer?.protection.toLowerCase() || "";
  const status = order.provider_status?.toLowerCase() || "";
  return {
    can_refill: active && protection.includes("refill") && !protection.includes("no refill") && ["completed", "partial"].includes(status),
    can_cancel: active && ["pending", "in progress", "processing"].includes(status),
  };
}
