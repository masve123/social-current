import { after, NextRequest, NextResponse } from "next/server";

import { createNowPaymentsInvoice, isPaidPaymentStatus } from "@/lib/nowpayments";
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
import { isProfileService, parseProfileTarget } from "@/lib/profile-target";
import { verifyProfile } from "@/lib/profile-verification";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

function allowedHosts(platform: string) {
  if (platform === "Instagram") return ["instagram.com", "www.instagram.com"];
  if (platform === "TikTok") return ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"];
  return ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"];
}

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
  try {
    const input = (await request.json()) as {
      serviceSlug?: string;
      offerId?: string;
      quantity?: number;
      link?: string;
      email?: string;
      comments?: string[];
      acceptedTerms?: boolean;
      paymentMethod?: "usdtbsc" | "any";
    };
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!await allowCheckoutAttempt(forwardedFor)) {
      return NextResponse.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429 });
    }
    if (input.acceptedTerms !== true) {
      return NextResponse.json({ error: "Accept the terms and refund policy to continue." }, { status: 400 });
    }
    if (input.paymentMethod !== undefined && !["usdtbsc", "any"].includes(input.paymentMethod)) {
      return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
    }
    const service = input.serviceSlug ? getService(input.serviceSlug) : undefined;
    if (!service) return NextResponse.json({ error: "Choose a valid service." }, { status: 400 });
    const offer = getServiceOffers(service).find((item) => item.id === input.offerId);
    if (!offer) return NextResponse.json({ error: "Choose a valid package." }, { status: 400 });

    const comments = input.comments?.map((comment) => comment.trim()).filter(Boolean) || [];
    const quantity = offer.customComments ? comments.length : Number(input.quantity);
    const min = offer.min ?? service.min;
    const max = offer.max ?? service.max;
    const step = offer.step ?? service.step;
    if (!Number.isInteger(quantity) || quantity < min || quantity > max || quantity % step !== 0) {
      const detail = offer.customComments
        ? `Provide between ${min.toLocaleString()} and ${max.toLocaleString()} comments, in multiples of ${step}.`
        : `Choose a quantity between ${min.toLocaleString()} and ${max.toLocaleString()}.`;
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const profileTarget = isProfileService(service) ? parseProfileTarget(service.platform, input.link || "") : null;
    let target: URL;
    try {
      target = new URL(profileTarget?.url || input.link || "");
    } catch {
      return NextResponse.json({ error: "Enter a complete public profile or post URL." }, { status: 400 });
    }
    if ((isProfileService(service) && !profileTarget) || target.protocol !== "https:" || !allowedHosts(service.platform).includes(target.hostname.toLowerCase())) {
      return NextResponse.json({ error: `Enter a valid public ${service.platform} URL.` }, { status: 400 });
    }
    if (profileTarget) {
      const profile = await verifyProfile(service.platform, profileTarget.url);
      if (profile.status === "not_found" || profile.status === "private") {
        return NextResponse.json({ error: profile.status === "private" ? "Make this profile public before ordering." : "That profile could not be found. Check the username before paying." }, { status: 400 });
      }
    }

    const email = input.email?.trim().toLowerCase();
    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const amount = Number(calculateOfferPrice(service, quantity, offer).toFixed(2));
    if (amount < minimumCheckoutUsd) {
      return NextResponse.json({ error: `Orders must total at least $${minimumCheckoutUsd.toFixed(2)}. Increase the quantity to continue.` }, { status: 400 });
    }
    publicId = createPublicOrderId();
    await createStoredOrder({
      publicId,
      email,
      serviceSlug: service.slug,
      offerId: offer.id,
      quantity,
      targetUrl: target.toString(),
      comments,
      amountUsd: amount,
    });

    const encodedOrder = encodeURIComponent(publicId);
    const invoice = await createNowPaymentsInvoice({
      orderId: publicId,
      amountUsd: amount,
      description: `${service.shortTitle} — ${offer.label} — ${quantity.toLocaleString()}`,
      callbackUrl: `${site.url}/api/payments/nowpayments`,
      successUrl: `${site.url}/order/complete?order=${encodedOrder}`,
      cancelUrl: `${site.url}/order/cancelled?order=${encodedOrder}`,
      payCurrency: input.paymentMethod === "usdtbsc" ? "usdtbsc" : undefined,
    });
    await attachPaymentInvoice(publicId, { invoiceId: String(invoice.id), checkoutUrl: invoice.invoice_url });

    return NextResponse.json({
      order: publicId,
      amount: amount.toFixed(2),
      checkout_url: invoice.invoice_url,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The secure checkout could not be created.";
    if (publicId) await markInvoiceCreationFailed(publicId, message).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get("order")?.trim();
  if (!orderNumber || orderNumber.length > 1024) {
    return NextResponse.json({ error: "Enter a valid order number." }, { status: 400 });
  }

  try {
    let order = await findStoredOrder(orderNumber);
    if (!order) return NextResponse.json({ error: "We could not find that order." }, { status: 404 });

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
      can_refill: Boolean(order.provider_order_id) && offer.protection.toLowerCase().includes("refill") && ["Completed", "Partial"].includes(order.provider_status || ""),
      can_cancel: Boolean(order.provider_order_id) && ["Pending", "In progress", "Processing"].includes(order.provider_status || ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not find that order.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
