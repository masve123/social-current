import { after, NextRequest, NextResponse } from "next/server";

import { createNowPaymentsInvoice, getNowPaymentsMinimum, isPaidPaymentStatus, PaymentSetupError } from "@/lib/nowpayments";
import { isPaymentCurrency } from "@/lib/payment-methods";
import { refreshOrderPayment } from "@/lib/payment-reconciliation";
import { fulfillPaidOrder } from "@/lib/order-processing";
import { recoverOrderIfStale } from "@/lib/fulfillment-recovery";
import {
  attachPaymentInvoice,
  allowCheckoutAttempt,
  createPublicOrderId,
  createStoredOrder,
  findStoredOrder,
  markInvoiceCreationFailed,
  updateProviderStatus,
} from "@/lib/order-store";
import { calculateOfferPrice, getServiceOffer, getServiceOffers } from "@/lib/smm-offers";
import { minimumCheckoutUsd } from "@/lib/checkout-pricing";
import { getService } from "@/lib/services";
import { getPanelOrderStatus } from "@/lib/smm";
import { isProfileService, parseOrderTarget } from "@/lib/profile-target";
import { verifyProfile } from "@/lib/profile-verification";
import { site } from "@/lib/site";
import { saveCheckoutEvent } from "@/lib/checkout-event-store";
import { verifyCheckoutRestart } from "@/lib/verify-checkout-restart";
import { checkoutRecoveryUrl } from "@/lib/checkout-recovery";
import { type CheckoutEvent } from "@/lib/checkout-events";
import { orderCapabilities } from "@/lib/order-actions";

export const runtime = "nodejs";
export const maxDuration = 60;

function customerStatus(paymentStatus: string, fulfillmentStatus: string, providerStatus?: string | null) {
  if (["invoice_failed", "failed", "expired"].includes(paymentStatus)) return "Payment was not completed";
  if (paymentStatus === "refunded") return "Payment refunded";
  if (paymentStatus === "partially_paid") return "The payment is incomplete";
  if (paymentStatus === "amount_mismatch" || fulfillmentStatus === "manual_review") return "Your order is being reviewed";
  if (!isPaidPaymentStatus(paymentStatus)) return "Waiting for payment confirmation";
  if (fulfillmentStatus === "queued_supplier_funds") return "Payment confirmed — queued for delivery";
  if (fulfillmentStatus === "retry") return "Payment confirmed — waiting for supplier connection";
  if (fulfillmentStatus === "submitting") return "Payment confirmed — starting delivery";
  if (providerStatus) return providerStatus;
  if (fulfillmentStatus === "submitted") return "In progress";
  return "Payment confirmed";
}

export async function POST(request: NextRequest) {
  let publicId: string | undefined;
  let eventDetails: Partial<CheckoutEvent> = {};
  async function reject(error:string,status=400,errorCode="invalid_details") {
    await saveCheckoutEvent({...eventDetails,event:"checkout_failed",order:publicId,errorCode});
    return NextResponse.json({error},{status});
  }
  try {
    const input = (await request.json()) as {
      serviceSlug?: string;
      offerId?: string;
      quantity?: number;
      link?: string;
      email?: string;
      comments?: string[];
      acceptedTerms?: boolean;
      paymentMethod?: string;
      checkoutSession?: string;
      resumeOrder?: string;
    };
    if (!input || typeof input !== "object" || Array.isArray(input)
      || (input.comments !== undefined && (!Array.isArray(input.comments) || input.comments.some((comment) => typeof comment !== "string")))
      || typeof input.email !== "string" || typeof input.link !== "string"
      || typeof input.serviceSlug !== "string" || typeof input.offerId !== "string") {
      return reject("Check your package, profile link and email before continuing.", 400);
    }
    eventDetails = {sessionId:typeof input.checkoutSession === "string" ? input.checkoutSession : undefined,serviceSlug:input.serviceSlug,offerId:input.offerId,currency:input.paymentMethod,quantity:input.comments?.length || input.quantity};
    await saveCheckoutEvent({...eventDetails,event:"checkout_submitted"});
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!await allowCheckoutAttempt(forwardedFor)) {
      return reject("Too many checkout attempts. Please try again later.", 429, "rate_limit");
    }
    if (input.acceptedTerms !== true) {
      return reject("Accept the terms and refund policy to continue.", 400);
    }
    if (input.resumeOrder !== undefined) {
      if (typeof input.resumeOrder !== "string" || !/^SC-\d{6}-[A-F0-9]{16}$/.test(input.resumeOrder)) return reject("Enter a valid earlier order number.");
      const previous = await findStoredOrder(input.resumeOrder);
      if (!previous || !await verifyCheckoutRestart(previous)) return reject("The earlier payment needs to be checked before starting another. Open order tracking or contact support.",409);
    }
    const payCurrency = input.paymentMethod ?? "usdtbsc";
    if (!isPaymentCurrency(payCurrency)) {
      return reject("Choose a valid payment method.", 400);
    }
    const service = input.serviceSlug ? getService(input.serviceSlug) : undefined;
    if (!service) return reject("Choose a valid service.", 400);
    const offer = getServiceOffers(service).find((item) => item.id === input.offerId);
    if (!offer) return reject("Choose a valid package.", 400);

    const comments = input.comments?.map((comment) => comment.trim()).filter(Boolean) || [];
    const quantity = offer.customComments ? comments.length : Number(input.quantity);
    const min = offer.min ?? service.min;
    const max = offer.max ?? service.max;
    const step = offer.step ?? service.step;
    if (!Number.isInteger(quantity) || quantity < min || quantity > max || quantity % step !== 0) {
      const detail = offer.customComments
        ? `Provide between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")} comments, in multiples of ${step}.`
        : `Choose a quantity between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")}.`;
      return reject(detail, 400);
    }

    const target = parseOrderTarget(service, input.link);
    if (!target) return reject(`Enter a valid public ${service.platform} ${isProfileService(service) ? "profile" : "post or video"} URL.`, 400);
    if (isProfileService(service)) {
      const profile = await verifyProfile(service.platform, target.url);
      if (profile.status === "not_found" || profile.status === "private") {
        return reject(profile.status === "private" ? "Make this profile public before ordering." : "That profile could not be found. Check the username before paying.", 400);
      }
    }

    const email = input.email?.trim().toLowerCase();
    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return reject("Enter a valid email address.", 400);
    }

    const amount = Number(calculateOfferPrice(service, quantity, offer).toFixed(2));
    if (amount < minimumCheckoutUsd) {
      return reject(`Orders must total at least $${minimumCheckoutUsd.toFixed(2)}. Increase the quantity to continue.`, 400);
    }
    const paymentMinimum = await getNowPaymentsMinimum(payCurrency);
    if (amount < paymentMinimum) {
      throw new PaymentSetupError(`This payment method currently requires at least $${paymentMinimum.toFixed(2)}. Increase the quantity or choose another payment method.`, paymentMinimum);
    }
    publicId = createPublicOrderId();
    await createStoredOrder({
      publicId,
      email,
      serviceSlug: service.slug,
      offerId: offer.id,
      quantity,
      targetUrl: target.url,
      comments,
      amountUsd: amount,
    });

    const encodedOrder = encodeURIComponent(publicId);
    const invoice = await createNowPaymentsInvoice({
      orderId: publicId,
      amountUsd: amount,
      description: `${service.shortTitle} — ${offer.label} — ${quantity.toLocaleString("en-US")}`,
      callbackUrl: `${site.url}/api/payments/nowpayments`,
      successUrl: `${site.url}/order/complete?order=${encodedOrder}`,
      cancelUrl: `${site.url}/order/cancelled?order=${encodedOrder}`,
      payCurrency,
    });
    await attachPaymentInvoice(publicId, { invoiceId: String(invoice.id), checkoutUrl: invoice.invoice_url, paymentId: invoice.payment_id });

    await saveCheckoutEvent({...eventDetails,event:"payment_setup_succeeded",order:publicId});
    return NextResponse.json({
      order: publicId,
      amount: amount.toFixed(2),
      checkout_url: invoice.invoice_url,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The secure checkout could not be created.";
    await saveCheckoutEvent({...eventDetails,event:"checkout_failed",order:publicId,errorCode:error instanceof SyntaxError ? "invalid_details" : error instanceof PaymentSetupError && error.minimumUsd ? "minimum" : "provider_unavailable"});
    if (publicId) await markInvoiceCreationFailed(publicId, message).catch(() => undefined);
    return NextResponse.json({ error: message, ...(error instanceof PaymentSetupError && error.minimumUsd ? { minimum_usd: error.minimumUsd } : {}) }, { status: error instanceof SyntaxError ? 400 : error instanceof PaymentSetupError && error.minimumUsd ? 400 : 502 });
  }
}

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get("order")?.trim();
  if (!orderNumber || orderNumber.length > 1024) {
    return NextResponse.json({error:"Enter a valid order number."},{status:400});
  }

  try {
    let order = await findStoredOrder(orderNumber);
    if (!order) return NextResponse.json({ error: "We could not find that order." }, { status: 404 });
    order = await refreshOrderPayment(order);

    if (order.fulfillment_status === "submitting") {
      order = await recoverOrderIfStale(orderNumber) || order;
    }

    const retryDue = order.fulfillment_status === "retry" && Date.now() - new Date(order.updated_at).getTime() > 2 * 60 * 1000;
    if (isPaidPaymentStatus(order.payment_status) && (order.fulfillment_status === "awaiting_payment" || retryDue)) {
      after(() => fulfillPaidOrder(orderNumber));
    }

    let startCount = "—";
    let remains = "—";
    if (order.provider && order.provider_order_id) {
      try {
        const providerResult = await getPanelOrderStatus(order.provider, order.provider_order_id);
        if (providerResult.status && providerResult.status !== order.provider_status) {
          order = await updateProviderStatus(orderNumber, providerResult.status) || order;
        }
        startCount = providerResult.start_count || "—";
        remains = providerResult.remains || "—";
      } catch {
        // Keep the last known status when the supplier is temporarily unavailable.
      }
    }

    const service = getService(order.service_slug);
    if (!service) throw new Error("This order references an unavailable service.");
    const offer = getServiceOffer(service, order.offer_id);
    const status = customerStatus(order.payment_status, order.fulfillment_status, order.provider_status);
    return NextResponse.json({
      order: order.public_id,
      service: service.shortTitle,
      package: offer.label,
      amount: `$${Number(order.amount_usd).toFixed(2)}`,
      status,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
      start_count: startCount,
      remains,
      ...orderCapabilities(order),
      retry_url: checkoutRecoveryUrl(order),
      payment_url: ["waiting","confirming","partially_paid"].includes(order.payment_status) && order.checkout_url?.startsWith("https://nowpayments.io/") ? order.checkout_url : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not find that order.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
