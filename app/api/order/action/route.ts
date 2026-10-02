import { NextRequest, NextResponse } from "next/server";

import { readOrderToken } from "@/lib/order-token";
import { requestPanelCancellation, requestPanelRefill } from "@/lib/smm";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as { order?: string; action?: "refill" | "cancel" };
    if (!input.order || !["refill", "cancel"].includes(input.action || "")) {
      return NextResponse.json({ error: "Choose a valid order action." }, { status: 400 });
    }

    const payload = readOrderToken(input.order);
    if (input.action === "refill") {
      const result = await requestPanelRefill(payload.provider, payload.providerOrder);
      return NextResponse.json({ status: result.status || "Refill requested", request: result.refill });
    }

    const result = await requestPanelCancellation(payload.provider, payload.providerOrder);
    return NextResponse.json({ status: result.status || "Cancellation requested", request: result.cancel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The provider could not process this request.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
