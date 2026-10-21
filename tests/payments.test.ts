import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { createNowPaymentsInvoice, getNowPaymentsMinimum, verifyNowPaymentsSignature } from "../lib/nowpayments";
import { GET as minimumRoute } from "../app/api/payments/minimum/route";

process.env.NOWPAYMENTS_API_KEY = "test-key";
process.env.NOWPAYMENTS_IPN_SECRET = "test-signing-secret";
process.env.NOWPAYMENTS_PAYOUT_CURRENCY = "usdttrc20";
afterEach(() => mock.restoreAll());
const input = { orderId: "SC-TEST", amountUsd: 29.94, description: "Test", callbackUrl: "https://example.com/callback", successUrl: "https://example.com/success", cancelUrl: "https://example.com/cancel", payCurrency: "usdtbsc" as const };

test("minimum checks use the real payment/settlement pair and matching fixed-rate fee flags", async () => {
  mock.method(globalThis, "fetch", async (url: string) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("currency_from"), "usdtbsc");
    assert.equal(query.get("currency_to"), "usdttrc20");
    assert.equal(query.get("is_fixed_rate"), "true");
    assert.equal(query.get("is_fee_paid_by_user"), "false");
    assert.equal(query.get("fiat_equivalent"), "usd");
    return Response.json({ min_amount: 12, fiat_equivalent: 12.001 });
  });
  assert.equal(await getNowPaymentsMinimum("usdtbsc"), 12.02);
});

test("unavailable and malformed minimums fail closed rather than redirecting buyers", async () => {
  for (const payload of [{}, { min_amount: 1, fiat_equivalent: 0 }, { min_amount: 1, fiat_equivalent: null }, { min_amount: 0, fiat_equivalent: 12 }, { min_amount: 1, fiat_equivalent: "not-a-number" }]) {
    mock.method(globalThis, "fetch", async () => Response.json(payload));
    await assert.rejects(() => getNowPaymentsMinimum("usdtbsc"), /could not verify/);
    mock.restoreAll();
  }
});

test("invoice creation must also prepare a real payment before redirecting", async () => {
  const paths: string[] = [];
  mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    paths.push(new URL(url).pathname);
    const body = JSON.parse(options.body as string);
    if (url.endsWith("/invoice")) {
      assert.equal(body.pay_currency, "usdtbsc");
      assert.equal(body.is_fixed_rate, true);
      assert.equal(body.is_fee_paid_by_user, false);
      return Response.json({ id: 123, invoice_url: "https://nowpayments.io/payment?iid=123" });
    }
    assert.deepEqual(body, { iid: 123, pay_currency: "usdtbsc" });
    return Response.json({ payment_id: 456, pay_address: "test-address", pay_amount: 30 });
  });
  const invoice = await createNowPaymentsInvoice(input);
  assert.equal(invoice.payment_id, "456");
  assert.deepEqual(paths, ["/v1/invoice", "/v1/invoice-payment"]);
});

test("the reproduced amountTo error is returned on our checkout before the hosted blank page", async () => {
  mock.method(globalThis, "fetch", async (url: string) => url.endsWith("/invoice")
    ? Response.json({ id: 123, invoice_url: "https://nowpayments.io/payment?iid=123" })
    : Response.json({ message: "Error when creating a payment. amountTo is too small" }, { status: 400 }));
  await assert.rejects(() => createNowPaymentsInvoice(input), /below.*minimum/);
});

test("missing payment instructions and untrusted redirect URLs are rejected", async () => {
  for (const invoiceUrl of ["https://nowpayments.io/payment?iid=123", "https://attacker.example/payment", "javascript:alert(1)"]) {
    mock.method(globalThis, "fetch", async (url: string) => url.endsWith("/invoice") ? Response.json({ id: 123, invoice_url: invoiceUrl }) : Response.json({ payment_id: 456 }));
    await assert.rejects(() => createNowPaymentsInvoice(input), /payment instructions|invalid checkout link/);
    mock.restoreAll();
  }
});

test("provider outages and non-JSON responses produce recoverable errors", async () => {
  for (const response of [new Response("upstream unavailable", { status: 502 }), Response.json({ message: "unavailable" }, { status: 503 })]) {
    mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(() => getNowPaymentsMinimum("ltc"), /try again|another method/i);
    mock.restoreAll();
  }
});

test("minimum endpoint accepts only supported currencies and never returns secrets", async () => {
  const invalid = await minimumRoute(new NextRequest("https://example.com/api/payments/minimum?currency=any"));
  assert.equal(invalid.status, 400);
  mock.method(globalThis, "fetch", async () => Response.json({ min_amount: 12, fiat_equivalent: 12 }));
  const result = await minimumRoute(new NextRequest("https://example.com/api/payments/minimum?currency=usdtbsc"));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { minimum_usd: 12.01 });
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("webhook signatures recursively sort nested payloads and reject tampering", () => {
  const payload = { payment_status: "finished", fee: { withdrawalFee: 0, currency: "usdttrc20" }, order_id: "SC-TEST" };
  const canonical = { fee: { currency: "usdttrc20", withdrawalFee: 0 }, order_id: "SC-TEST", payment_status: "finished" };
  const signature = createHmac("sha512", "test-signing-secret").update(JSON.stringify(canonical)).digest("hex");
  assert.equal(verifyNowPaymentsSignature(payload, signature), true);
  assert.equal(verifyNowPaymentsSignature({ ...payload, order_id: "SC-OTHER" }, signature), false);
  assert.equal(verifyNowPaymentsSignature(payload, "bad"), false);
});

test("minimum endpoint returns a recoverable error on provider failure", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ message: "internal secret details" }, { status: 503 }));
  const result = await minimumRoute(new NextRequest("https://example.com/api/payments/minimum?currency=usdtbsc"));
  assert.equal(result.status, 503);
  const body = await result.json();
  assert.match(body.error, /another method|try again/i);
  assert.ok(!body.error.includes("secret"));
});
