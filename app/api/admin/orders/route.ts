import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { fulfillPaidOrder } from "@/lib/order-processing";
import { recoverStaleOrders } from "@/lib/fulfillment-recovery";
import { findStoredOrder, listActionableOrders, makeOrderRetryable } from "@/lib/order-store";
import { getPanelBalance } from "@/lib/smm";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const expected = process.env.SMM_FULFILLMENT_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  await recoverStaleOrders();
  const orders = await listActionableOrders(Number(request.nextUrl.searchParams.get("limit")) || 50);
  const supplierBalance = await getPanelBalance("smmworld").catch(() => null);
  return NextResponse.json({ orders, supplier_balance: supplierBalance });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const input = (await request.json()) as { order?: string; reviewedProvider?: boolean };
  if (!input.order) return NextResponse.json({ error: "Order is required." }, { status: 400 });
  const current = await findStoredOrder(input.order);
  if (current && ["retry", "awaiting_payment"].includes(current.fulfillment_status) && ["confirmed", "sending", "finished"].includes(current.payment_status)) {
    await fulfillPaidOrder(current.public_id);
    return NextResponse.json({ order: current.public_id, retried: true });
  }
  const order = await makeOrderRetryable(input.order, input.reviewedProvider === true);
  if (!order) return NextResponse.json({ error: "This order cannot be retried automatically." }, { status: 409 });
  await fulfillPaidOrder(order.public_id);
  return NextResponse.json({ order: order.public_id, retried: true });
}
