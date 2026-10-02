import { createHash } from "node:crypto";

import { after, NextRequest, NextResponse } from "next/server";
import { isPaidPaymentStatus, type NowPaymentsIpn, verifyNowPaymentsSignature } from "@/lib/nowpayments";
import { fulfillPaidOrder } from "@/lib/order-processing";
import { findStoredOrder, recordPaymentEvent } from "@/lib/order-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let payload: NowPaymentsIpn;
  try {
    payload = JSON.parse(rawBody) as NowPaymentsIpn;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!verifyNowPaymentsSignature(payload, request.headers.get("x-nowpayments-sig"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const publicId = typeof payload.order_id === "string" ? payload.order_id : "";
  let paymentStatus = typeof payload.payment_status === "string" ? payload.payment_status.toLowerCase() : "unknown";
  const order = publicId ? await findStoredOrder(publicId) : undefined;
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const statusRank = ["waiting", "confirming", "confirmed", "sending", "finished"];
  const currentRank = statusRank.indexOf(order.payment_status);
  const nextRank = statusRank.indexOf(paymentStatus);
  if (isPaidPaymentStatus(order.payment_status) && !isPaidPaymentStatus(paymentStatus) && paymentStatus !== "refunded") {
    paymentStatus = order.payment_status;
  } else if (currentRank > nextRank && nextRank >= 0) {
    paymentStatus = order.payment_status;
  }

  const receivedAmount = Number(payload.price_amount);
  const expectedAmount = Number(order.amount_usd);
  const currency = String(payload.price_currency || "").toLowerCase();
  const amountMatches = currency === "usd" && Number.isFinite(receivedAmount)
    && Math.abs(receivedAmount - expectedAmount) < 0.01;

  const updated = await recordPaymentEvent({
    rawBody: rawBody || createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    publicId,
    paymentStatus,
    paymentId: payload.payment_id === undefined ? undefined : String(payload.payment_id),
    payload,
    amountMatches,
  });

  if (updated && amountMatches && isPaidPaymentStatus(paymentStatus) && updated.fulfillment_status === "awaiting_payment") {
    after(() => fulfillPaidOrder(publicId));
  }

  return NextResponse.json({ received: true });
}
