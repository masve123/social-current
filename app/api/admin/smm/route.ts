import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { calculateOfferPrice, getServiceOffers } from "@/lib/smm-offers";
import { services } from "@/lib/services";
import { getConfiguredRoutes, getPanelBalance, getPanelServices, type ProviderId } from "@/lib/smm";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.SMM_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const provider = request.nextUrl.searchParams.get("provider") as ProviderId | null;
  const action = request.nextUrl.searchParams.get("action") || "services";
  if (!provider || !["followiz", "smmworld", "smmpwr"].includes(provider)) {
    return NextResponse.json({ error: "Choose followiz, smmworld, or smmpwr." }, { status: 400 });
  }
  if (!["services", "balance", "routes"].includes(action)) {
    return NextResponse.json({ error: "Choose services, balance, or routes." }, { status: 400 });
  }

  try {
    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
    if (action === "routes") {
      const catalog = await getPanelServices(provider);
      const mapped = services.flatMap((service) => getServiceOffers(service).flatMap((offer) => {
        const routes = (() => {
          try {
            return getConfiguredRoutes(service.slug, offer.id);
          } catch {
            return [];
          }
        })();
        return routes.filter((route) => route.provider === provider).map((route) => {
          const providerService = catalog.find((item) => String(item.service) === route.serviceId);
          const rate = Number(providerService?.rate);
          const wholesaleCost = Number.isFinite(rate) ? (rate * service.baseQuantity) / 1000 : undefined;
          const retailPrice = calculateOfferPrice(service, service.baseQuantity, offer);
          return {
            service: service.slug,
            package: offer.id,
            providerServiceId: route.serviceId,
            providerService: providerService?.name || "Service ID not found",
            baseQuantity: service.baseQuantity,
            retailPrice: Number(retailPrice.toFixed(2)),
            wholesaleCost: wholesaleCost === undefined ? null : Number(wholesaleCost.toFixed(4)),
            grossMargin: wholesaleCost === undefined ? null : Number((((retailPrice - wholesaleCost) / retailPrice) * 100).toFixed(1)),
            refill: providerService?.refill,
            cancel: providerService?.cancel,
          };
        });
      }));
      const data = query
        ? mapped.filter((item) => `${item.service} ${item.package} ${item.providerService}`.toLowerCase().includes(query))
        : mapped;
      return NextResponse.json({ provider, action, data });
    }
    const providerData = action === "balance" ? await getPanelBalance(provider) : await getPanelServices(provider);
    const data = Array.isArray(providerData) && query
      ? providerData.filter((service) => `${service.category} ${service.name} ${service.type}`.toLowerCase().includes(query))
      : providerData;
    return NextResponse.json({ provider, action, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The provider request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
