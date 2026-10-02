import { sendOrderUpdate, sendSupplierBalanceAlert } from "@/lib/email";
import {
  claimOrderForFulfillment,
  markOrderManualReview,
  markOrderQueued,
  markOrderSubmitted,
} from "@/lib/order-store";
import { getService } from "@/lib/services";
import {
  createPanelOrder,
  getConfiguredRoutes,
  getPanelBalance,
  getPanelServices,
} from "@/lib/smm";

export async function fulfillPaidOrder(publicId: string) {
  const order = await claimOrderForFulfillment(publicId);
  if (!order) return;

  const service = getService(order.service_slug);
  if (!service) {
    const reviewed = await markOrderManualReview(publicId, "The storefront service is no longer available.");
    if (reviewed) await Promise.allSettled([sendOrderUpdate(reviewed, "Your order is under review", "Payment is confirmed. Our team is reviewing the fulfillment route before delivery starts."), sendSupplierBalanceAlert(reviewed, reviewed.failure_reason || "Missing storefront service.")]);
    return;
  }

  const route = getConfiguredRoutes(order.service_slug, order.offer_id)[0];
  if (!route) {
    const reviewed = await markOrderManualReview(publicId, "No supplier route is configured for this package.");
    if (reviewed) await Promise.allSettled([sendOrderUpdate(reviewed, "Your order is under review", "Payment is confirmed. Our team is reviewing the fulfillment route before delivery starts."), sendSupplierBalanceAlert(reviewed, reviewed.failure_reason || "Missing supplier route.")]);
    return;
  }

  let wholesaleCost: number | undefined;
  try {
    const [balanceResult, catalog] = await Promise.all([
      getPanelBalance(route.provider),
      getPanelServices(route.provider),
    ]);
    const supplierService = catalog.find((item) => String(item.service) === route.serviceId);
    const rate = Number(supplierService?.rate);
    const balance = Number(balanceResult.balance);
    if (Number.isFinite(rate)) wholesaleCost = (rate * order.quantity) / 1000;

    if (wholesaleCost !== undefined && Number.isFinite(balance) && balance < wholesaleCost) {
      const reason = `Supplier balance is $${balance.toFixed(2)}; this order needs about $${wholesaleCost.toFixed(2)}.`;
      const queued = await markOrderQueued(publicId, reason, wholesaleCost);
      if (queued) {
        await Promise.allSettled([
          sendOrderUpdate(queued, "Payment confirmed", "Your order is queued for delivery. We will start it after supplier funds are available."),
          sendSupplierBalanceAlert(queued, reason),
        ]);
      }
      return;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The supplier balance could not be checked.";
    const queued = await markOrderQueued(publicId, reason);
    if (queued) await Promise.allSettled([sendSupplierBalanceAlert(queued, reason)]);
    return;
  }

  try {
    const result = await createPanelOrder({
      serviceSlug: order.service_slug,
      offerId: order.offer_id,
      quantity: order.quantity,
      link: order.target_url,
      comments: order.comments,
    });
    const submitted = await markOrderSubmitted(publicId, {
      provider: result.provider,
      providerOrderId: result.providerOrder,
      providerStatus: result.status,
      wholesaleCost,
    });
    if (submitted) {
      await Promise.allSettled([
        sendOrderUpdate(submitted, "Your order has started", "Payment is confirmed and your campaign has been sent for delivery."),
      ]);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The supplier rejected this order.";
    if (/balance|funds|credit/i.test(reason)) {
      const queued = await markOrderQueued(publicId, reason, wholesaleCost);
      if (queued) await Promise.allSettled([sendSupplierBalanceAlert(queued, reason)]);
      return;
    }
    const reviewed = await markOrderManualReview(publicId, `${reason} Check the supplier dashboard before retrying to avoid a duplicate order.`);
    if (reviewed) await Promise.allSettled([
      sendOrderUpdate(reviewed, "Your order is under review", "Payment is confirmed. Our team is checking delivery before taking another action."),
      sendSupplierBalanceAlert(reviewed, reviewed.failure_reason || reason),
    ]);
  }
}
