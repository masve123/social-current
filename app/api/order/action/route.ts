import { NextRequest, NextResponse } from "next/server";

import { findStoredOrder, updateProviderStatus } from "@/lib/order-store";
import { requestPanelCancellation, requestPanelRefill } from "@/lib/smm";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as { order?: string; action?: "refill" | "cancel" };
    if (!input.order || !["refill", "cancel"].includes(input.action || "")) {
      return NextResponse.json({ error: "Choose a valid order action." }, { status: 400 });
    }

    const order = await findStoredOrder(input.order);
    if (!order?.provider || !order.provider_order_id) {
      return NextResponse.json({ error: "This order has not started delivery yet." }, { status: 409 });
    }

    if (input.action === "refill") {
      const result = await requestPanelRefill(order.provider, order.provider_order_id);
      return NextResponse.json({ status: result.status || "Refill requested", request: result.refill });
    }

    const result = await requestPanelCancellation(order.provider, order.provider_order_id);
    await updateProviderStatus(input.order, result.status || "Cancellation requested");
    return NextResponse.json({ status: result.status || "Cancellation requested", request: result.cancel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The provider could not process this request.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
