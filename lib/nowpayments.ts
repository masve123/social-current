import { createHmac, timingSafeEqual } from "node:crypto";

const endpoint = "https://api.nowpayments.io/v1";

function apiKey() {
  const value = process.env.NOWPAYMENTS_API_KEY;
  if (!value) throw new Error("NOWPAYMENTS_API_KEY is not configured.");
  return value;
}

export type NowPaymentsInvoice = {
  id: string;
  order_id: string;
  price_amount: string;
  price_currency: string;
  invoice_url: string;
};

export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };

export type NowPaymentsIpn = Record<string, JsonValue | undefined> & {
  payment_id?: number | string;
  payment_status?: string;
  price_amount?: number | string;
  price_currency?: string;
  order_id?: string;
};

export async function createNowPaymentsInvoice(input: {
  orderId: string;
  amountUsd: number;
  description: string;
  callbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const response = await fetch(`${endpoint}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify({
      price_amount: Number(input.amountUsd.toFixed(2)),
      price_currency: "usd",
      order_id: input.orderId,
      order_description: input.description,
      ipn_callback_url: input.callbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      partially_paid_url: input.successUrl,
      is_fixed_rate: true,
      is_fee_paid_by_user: true,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  let data: NowPaymentsInvoice & { message?: string };
  try {
    data = JSON.parse(text) as NowPaymentsInvoice & { message?: string };
  } catch {
    throw new Error("NOWPayments returned an invalid response.");
  }
  if (!response.ok || !data.id || !data.invoice_url) {
    throw new Error(data.message || `NOWPayments invoice creation failed (${response.status}).`);
  }
  return data;
}

function sortedPayload(payload: Record<string, unknown>) {
  return Object.keys(payload).sort().reduce<Record<string, unknown>>((result, key) => {
    result[key] = payload[key];
    return result;
  }, {});
}

export function verifyNowPaymentsSignature(payload: Record<string, JsonValue | undefined>, suppliedSignature: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !suppliedSignature) return false;
  const expected = createHmac("sha512", secret.trim())
    .update(JSON.stringify(sortedPayload(payload)))
    .digest("hex");
  const supplied = suppliedSignature.trim().toLowerCase();
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function isPaidPaymentStatus(status: string) {
  return ["confirmed", "sending", "finished"].includes(status.toLowerCase());
}
