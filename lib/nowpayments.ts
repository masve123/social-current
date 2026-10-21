import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentCurrency } from "@/lib/payment-methods";

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
  payment_id?: string;
};

export class PaymentSetupError extends Error {
  constructor(message: string, readonly minimumUsd?: number) {
    super(message);
    this.name = "PaymentSetupError";
  }
}

async function paymentRequest(path: string, body?: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(`${endpoint}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey() },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new PaymentSetupError("The payment provider could not be reached. Please try again shortly.");
  }
  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new PaymentSetupError("The payment provider returned an invalid response. Please try again shortly.");
  }
  if (!response.ok || !data || typeof data !== "object") {
    const message = typeof data?.message === "string" ? data.message : "";
    if (/too small|minimum|minimal/i.test(message)) {
      throw new PaymentSetupError("This amount is below the payment provider's current minimum. Increase the quantity or choose another payment method.");
    }
    throw new PaymentSetupError("This payment method is temporarily unavailable. Choose another method or try again shortly.");
  }
  return data;
}

export async function getNowPaymentsMinimum(payCurrency: PaymentCurrency) {
  const params = new URLSearchParams({
    currency_from: payCurrency,
    currency_to: process.env.NOWPAYMENTS_PAYOUT_CURRENCY || "usdttrc20",
    fiat_equivalent: "usd",
    is_fixed_rate: "true",
    is_fee_paid_by_user: "false",
  });
  const data = await paymentRequest(`/min-amount?${params}`);
  const minimum = Number(data.fiat_equivalent);
  if (!Number.isFinite(minimum) || minimum <= 0 || !Number.isFinite(Number(data.min_amount)) || Number(data.min_amount) <= 0) {
    throw new PaymentSetupError("We could not verify the minimum for this payment method. Choose another method or try again shortly.");
  }
  // Round up, with one cent of headroom rather than rounding below the limit.
  return (Math.ceil(minimum * 100) + 1) / 100;
}

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
  payCurrency: PaymentCurrency;
}) {
  const data = await paymentRequest("/invoice", {
      price_amount: Number(input.amountUsd.toFixed(2)),
      price_currency: "usd",
      pay_currency: input.payCurrency,
      order_id: input.orderId,
      order_description: input.description,
      ipn_callback_url: input.callbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      partially_paid_url: input.successUrl,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
  });
  if (!data.id || typeof data.invoice_url !== "string") {
    throw new PaymentSetupError("The payment provider did not return a checkout link. Please try again shortly.");
  }
  let checkoutUrl: URL;
  try { checkoutUrl = new URL(data.invoice_url); } catch { throw new PaymentSetupError("The payment provider returned an invalid checkout link."); }
  if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "nowpayments.io") {
    throw new PaymentSetupError("The payment provider returned an invalid checkout link.");
  }
  // An invoice alone can succeed below the payment minimum, leaving the buyer
  // on a blank hosted page. Create its payment before returning the redirect.
  const payment = await paymentRequest("/invoice-payment", { iid: data.id, pay_currency: input.payCurrency });
  if (!payment.payment_id || !payment.pay_address || Number(payment.pay_amount) <= 0 || !Number.isFinite(Number(payment.pay_amount))) {
    throw new PaymentSetupError("The payment provider could not prepare payment instructions. Choose another payment method.");
  }
  return { ...data, payment_id: String(payment.payment_id) } as NowPaymentsInvoice;
}

export async function getNowPaymentsPayment(paymentId: string) {
  return await paymentRequest(`/payment/${encodeURIComponent(paymentId)}`) as NowPaymentsIpn;
}

function sortedPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedPayload);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, sortedPayload(item)]));
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
