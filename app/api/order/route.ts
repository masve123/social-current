import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { assertOrderTokenReady, createOrderToken, readOrderToken } from "@/lib/order-token";
import { calculateOfferPrice, getServiceOffer, getServiceOffers } from "@/lib/smm-offers";
import { getService } from "@/lib/services";
import { createPanelOrder, getPanelOrderStatus } from "@/lib/smm";

export const runtime = "nodejs";

function allowedHosts(platform: string) {
  if (platform === "Instagram") return ["instagram.com", "www.instagram.com"];
  if (platform === "TikTok") return ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"];
  return ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"];
}

function fulfillmentAuthorized(request: NextRequest) {
  if (process.env.SMM_ALLOW_UNPAID_ORDERS === "true") return true;
  const expected = process.env.SMM_FULFILLMENT_SECRET;
  const supplied = request.headers.get("x-social-current-fulfillment");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as {
      serviceSlug?: string;
      offerId?: string;
      quantity?: number;
      link?: string;
      email?: string;
      comments?: string[];
    };
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

    let target: URL;
    try {
      target = new URL(input.link || "");
    } catch {
      return NextResponse.json({ error: "Enter a complete public profile or post URL." }, { status: 400 });
    }
    if (target.protocol !== "https:" || !allowedHosts(service.platform).includes(target.hostname.toLowerCase())) {
      return NextResponse.json({ error: `Enter a valid public ${service.platform} URL.` }, { status: 400 });
    }

    if (!input.email || !/^\S+@\S+\.\S+$/.test(input.email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const amount = calculateOfferPrice(service, quantity, offer).toFixed(2);
    if (process.env.SMM_LIVE_ORDERING !== "true") {
      return NextResponse.json({
        order: `PREVIEW-${Date.now().toString().slice(-6)}`,
        preview: true,
        amount,
        message: "Preview mode is active. No provider order was submitted.",
      });
    }

    if (!fulfillmentAuthorized(request)) {
      return NextResponse.json(
        { error: "Payment confirmation is required before this order can be fulfilled." },
        { status: 402 },
      );
    }

    assertOrderTokenReady();
    const result = await createPanelOrder({
      serviceSlug: service.slug,
      offerId: offer.id,
      quantity,
      link: target.toString(),
      comments,
    });
    const order = createOrderToken({
      provider: result.provider,
      providerOrder: result.providerOrder,
      serviceSlug: service.slug,
      offerId: offer.id,
    });
    return NextResponse.json({ order, status: result.status, amount }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The provider could not create this order.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const order = request.nextUrl.searchParams.get("order")?.trim();
  if (!order || order.length > 1024) {
    return NextResponse.json({ error: "Enter a valid order number." }, { status: 400 });
  }
  if (order.startsWith("PREVIEW-")) {
    return NextResponse.json({ status: "Preview", order, remains: "No live delivery", can_refill: false, can_cancel: false });
  }
  try {
    const payload = readOrderToken(order);
    const service = getService(payload.serviceSlug);
    if (!service) throw new Error("This order references an unavailable service.");
    const offer = getServiceOffer(service, payload.offerId);
    const result = await getPanelOrderStatus(payload.provider, payload.providerOrder);
    const status = result.status || "Pending";
    return NextResponse.json({
      order,
      service: service.shortTitle,
      package: offer.label,
      status,
      start_count: result.start_count || "—",
      remains: result.remains || "—",
      can_refill: offer.protection.toLowerCase().includes("refill") && ["Completed", "Partial"].includes(status),
      can_cancel: ["Pending", "In progress", "Processing"].includes(status),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The provider could not find this order.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
