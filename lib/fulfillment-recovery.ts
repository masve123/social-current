import { sendFulfillmentReviewAlert, sendOrderUpdate } from "@/lib/email";
import { fulfillPaidOrder } from "@/lib/order-processing";
import { listPaidOrdersAwaitingFulfillment, reconcileStaleOrder, reconcileStaleOrders, type StoredOrder } from "@/lib/order-store";

async function notifyManualReview(order: StoredOrder) {
  if (order.fulfillment_status !== "manual_review") return;
  await Promise.allSettled([
    sendOrderUpdate(order, "Your order is under review", "Payment is confirmed. We are checking the supplier submission before taking another action."),
    sendFulfillmentReviewAlert(order),
  ]);
}

export async function recoverOrderIfStale(publicId: string) {
  const order = await reconcileStaleOrder(publicId);
  if (order) await notifyManualReview(order);
  return order;
}

export async function recoverStaleOrders() {
  const stale = await reconcileStaleOrders(50);
  await Promise.allSettled(stale.map(notifyManualReview));
  return stale;
}

export async function recoverPendingOrders() {
  const stale = await recoverStaleOrders();
  const pending = await listPaidOrdersAwaitingFulfillment(25);
  const results = await Promise.allSettled(pending.map((order) => fulfillPaidOrder(order.public_id)));
  return {
    staleReviewed: stale.filter((order) => order.fulfillment_status === "manual_review").length,
    staleRetried: stale.filter((order) => order.fulfillment_status === "retry").length,
    pendingAttempted: pending.length,
    errors: results.filter((result) => result.status === "rejected").length,
  };
}
