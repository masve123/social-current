import type { StoredOrder } from "@/lib/order-store";
export function canRestartCheckout(order:StoredOrder) {
  return ["expired","failed","invoice_failed"].includes(order.payment_status)
    && !order.paid_at && !order.provider_order_id && !order.supplier_request_started_at
    && (!order.payment_payload?.actually_paid || Number(order.payment_payload.actually_paid)===0);
}
export function checkoutRecoveryUrl(order:StoredOrder) {
  return canRestartCheckout(order) ? `/order?resume=${encodeURIComponent(order.public_id)}` : undefined;
}
