import { NextRequest, NextResponse } from "next/server";
import { getNowPaymentsMinimum } from "@/lib/nowpayments";
import { isPaymentCurrency } from "@/lib/payment-methods";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const currency = request.nextUrl.searchParams.get("currency");
  if (!isPaymentCurrency(currency)) {
    return NextResponse.json({ error: "Choose a supported payment method." }, { status: 400 });
  }
  try {
    return NextResponse.json({ minimum_usd: await getNowPaymentsMinimum(currency) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment availability could not be checked." }, { status: 503 });
  }
}
