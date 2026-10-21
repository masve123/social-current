import { getNowPaymentsPayment, isPaidPaymentStatus } from "@/lib/nowpayments";
import { recordPaymentEvent, type StoredOrder } from "@/lib/order-store";

export async function refreshOrderPayment(order: StoredOrder) {
  if (!order.payment_id || isPaidPaymentStatus(order.payment_status)
    || !["waiting", "confirming", "partially_paid"].includes(order.payment_status)
    || Date.now() - new Date(order.updated_at).getTime() < 30_000) return order;
  try {
    const payload = await getNowPaymentsPayment(order.payment_id);
    // Never apply a provider response to a different customer's order.
    if (payload.order_id !== order.public_id || String(payload.payment_id) !== order.payment_id
      || typeof payload.payment_status !== "string") return order;
    const amountMatches = String(payload.price_currency).toLowerCase() === "usd"
      && Number.isFinite(Number(payload.price_amount))
      && Math.abs(Number(payload.price_amount) - Number(order.amount_usd)) < 0.01;
    if (amountMatches && payload.payment_status === order.payment_status
      && payload.actually_paid === order.payment_payload?.actually_paid) return order;
    return await recordPaymentEvent({
      rawBody: `provider-status:${JSON.stringify(payload)}`,
      publicId: order.public_id,
      paymentStatus: payload.payment_status.toLowerCase(),
      paymentId: order.payment_id,
      payload,
      amountMatches,
    }) || order;
  } catch {
    // A provider outage must not erase a verified payment or break tracking.
    return order;
  }
}
