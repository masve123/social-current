import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { services } from "../lib/services";
import { calculateOfferPrice, getServiceOffers } from "../lib/smm-offers";
import { getCheckoutMinimumQuantity } from "../lib/checkout-pricing";
import { paymentMethods } from "../lib/payment-methods";
import { fulfillPaidOrder } from "../lib/order-processing";
import { reconcileStaleOrder, markSupplierRequestStarted, claimOrderForFulfillment, makeOrderRetryable } from "../lib/order-store";
import { POST as webhook } from "../app/api/payments/nowpayments/route";
import { POST as orderAction } from "../app/api/order/action/route";
import { POST, GET as lookupOrder } from "../app/api/order/route";
import { POST as browserEvent } from "../app/api/checkout/events/route";
import { saveCheckoutEvent, checkoutFunnel } from "../lib/checkout-event-store";
import { POST as answerDiscovery, GET as getDiscovery } from "../app/api/order/discovery/route";
import { discoveryReport } from "../lib/discovery-survey-store";
import { database, ensureDatabase } from "../lib/db";
import { attachPaymentInvoice, createStoredOrder, findStoredOrder, recordPaymentEvent } from "../lib/order-store";
import { refreshOrderPayment } from "../lib/payment-reconciliation";

const connection = process.env.TEST_DATABASE_URL;
if (process.env.CI && !connection) throw new Error("CI must run integration tests against an isolated TEST_DATABASE_URL.");
if (connection) {
  const parsed = new URL(connection);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) || parsed.username !== "checkout_test") {
    throw new Error("Integration tests require an isolated loopback database owned by checkout_test.");
  }
  process.env.DATABASE_URL = connection;
  process.env.NOWPAYMENTS_API_KEY = "test-only";
  process.env.NOWPAYMENTS_PAYOUT_CURRENCY = "usdttrc20";
  process.env.NOWPAYMENTS_IPN_SECRET = "test-signing-secret";
  process.env.SMM_SMMWORLD_API_KEY = "test-supplier-key";
  delete process.env.RESEND_API_KEY;
  delete process.env.HIKER_API_KEY;
}
const integration = connection ? test : test.skip;
const checkout = { serviceSlug: "instagram-followers", offerId: "usa-female", quantity: 200, link: "@instagram", email: "checkout-test@example.com", acceptedTerms: true, paymentMethod: "usdtbsc" };
const request = (body: unknown) => new NextRequest("https://example.com/api/order", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

before(async () => { if (connection) {await ensureDatabase(); await discoveryReport(); await saveCheckoutEvent({event:"checkout_opened"});} });
beforeEach(async () => {
  if (connection) await database()`TRUNCATE social_current_discovery_answers, social_current_checkout_events, social_current_payment_events, social_current_orders, social_current_checkout_attempts`;
});
afterEach(() => mock.restoreAll());
after(async () => { if (connection) await database().end(); });

function gateway(options: { minimum?: number; rejectPayment?: boolean; callbackDuringSetup?: boolean } = {}) {
  let orderId = "";
  let amount = 0;
  mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    if (/^https:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com)\//.test(String(url))) return new Response(null, { status: 302 });
    assert.ok(String(url).startsWith("https://api.nowpayments.io/v1/"), `Unexpected network call: ${url}`);
    if (url.includes("/min-amount?")) return Response.json({ min_amount: 1, fiat_equivalent: options.minimum ?? 6 });
    if (url.endsWith("/invoice")) {
      const body = JSON.parse(init!.body as string);
      orderId = body.order_id;
      amount = body.price_amount;
      return Response.json({ id: "123", invoice_url: "https://nowpayments.io/payment?iid=123" });
    }
    assert.ok(url.endsWith("/invoice-payment"));
    if (options.rejectPayment) return Response.json({ message: "amountTo is too small" }, { status: 400 });
    if (options.callbackDuringSetup) {
      await recordPaymentEvent({ rawBody: "test-paid-race", publicId: orderId, paymentStatus: "finished", paymentId: "456", amountMatches: true, payload: { order_id: orderId, payment_id: "456", payment_status: "finished", price_amount: amount, price_currency: "usd" } });
    }
    return Response.json({ payment_id: "456", pay_address: "test-address", pay_amount: amount });
  });
}

integration("checkout stores corrected price and only redirects after payment initialization", async () => {
  gateway();
  const response = await POST(request(checkout));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.amount, "15.59");
  assert.equal(result.checkout_url, "https://nowpayments.io/payment?iid=123");
  const order = await findStoredOrder(result.order);
  assert.equal(order?.amount_usd, "15.59");
  assert.equal(order?.payment_id, "456");
  assert.equal(order?.payment_status, "waiting");
});

integration("provider minimum rejects checkout before creating an order or invoice", async () => {
  gateway({ minimum: 20 });
  const response = await POST(request(checkout));
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.minimum_usd, 20.01);
  const [count] = await database()`SELECT COUNT(*)::int AS count FROM social_current_orders`;
  assert.equal(count.count, 0);
});

integration("provider payment failure is recorded and never returns an unusable redirect", async () => {
  gateway({ rejectPayment: true });
  const response = await POST(request(checkout));
  assert.equal(response.status, 502);
  const result = await response.json();
  assert.match(result.error, /minimum/);
  assert.equal(result.checkout_url, undefined);
  const [order] = await database()`SELECT payment_status, failure_reason FROM social_current_orders`;
  assert.equal(order.payment_status, "invoice_failed");
  assert.match(order.failure_reason, /minimum/);
});

integration("a payment callback arriving before invoice attachment stays paid", async () => {
  gateway({ callbackDuringSetup: true });
  const response = await POST(request(checkout));
  assert.equal(response.status, 201);
  const result = await response.json();
  const order = await findStoredOrder(result.order);
  assert.equal(order?.payment_status, "finished");
  assert.equal(order?.payment_id, "456");
  assert.ok(order?.paid_at);
});

integration("malformed input and invalid quantity steps return validation errors", async () => {
  gateway();
  for (const body of [null, [], { ...checkout, comments: [123] }, { ...checkout, email: 123 }, { ...checkout, quantity: 150 }, { ...checkout, paymentMethod: "any" }]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  const [count] = await database()`SELECT COUNT(*)::int AS count FROM social_current_orders`;
  assert.equal(count.count, 0);
});

async function staleOrder() {
  const publicId = "SC-TEST-RECONCILIATION";
  await createStoredOrder({ publicId, email: "test@example.com", serviceSlug: "instagram-followers", offerId: "standard", quantity: 1000, targetUrl: "https://www.instagram.com/instagram/", comments: [], amountUsd: 12.99 });
  await attachPaymentInvoice(publicId, { invoiceId: "123", checkoutUrl: "https://nowpayments.io/payment?iid=123", paymentId: "456" });
  await database()`UPDATE social_current_orders SET updated_at = NOW() - INTERVAL '1 minute' WHERE public_id = ${publicId}`;
  return (await findStoredOrder(publicId))!;
}

integration("tracking recovers an expired payment when its webhook was missed", async () => {
  const order = await staleOrder();
  mock.method(globalThis, "fetch", async () => Response.json({ payment_id: "456", order_id: order.public_id, payment_status: "expired", price_currency: "usd", price_amount: 12.99, actually_paid: 0 }));
  const refreshed = await refreshOrderPayment(order);
  assert.equal(refreshed.payment_status, "expired");
  assert.equal((await findStoredOrder(order.public_id))?.payment_status, "expired");
});

integration("tracking validates order identity and amount before recovering a payment", async () => {
  const order = await staleOrder();
  mock.method(globalThis, "fetch", async () => Response.json({ payment_id: "456", order_id: "SC-DIFFERENT", payment_status: "finished", price_currency: "usd", price_amount: 12.99 }));
  assert.equal((await refreshOrderPayment(order)).payment_status, "waiting");
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => Response.json({ payment_id: "456", order_id: order.public_id, payment_status: "finished", price_currency: "usd", price_amount: 1 }));
  const mismatched = await refreshOrderPayment(order);
  assert.equal(mismatched.payment_status, "amount_mismatch");
  assert.equal(mismatched.fulfillment_status, "manual_review");
  assert.equal(mismatched.paid_at, null);
});

integration("tracking recovers a missed paid callback without submitting to the supplier", async () => {
  const order = await staleOrder();
  mock.method(globalThis, "fetch", async () => Response.json({ payment_id: "456", order_id: order.public_id, payment_status: "finished", price_currency: "usd", price_amount: 12.99 }));
  const refreshed = await refreshOrderPayment(order);
  assert.equal(refreshed.payment_status, "finished");
  assert.ok(refreshed.paid_at);
  assert.equal(refreshed.provider_order_id, null);
});


// Cross-product: every storefront service/offer can create a checkout through
// every offered currency. Provider calls are simulated; database writes stay local.
for (const service of services) for (const offer of getServiceOffers(service)) for (const method of paymentMethods) {
  integration(`matrix: ${service.slug}/${offer.id}/${method.id}`, async () => {
    gateway({ minimum: 1 });
    const quantity = getCheckoutMinimumQuantity(service, offer, 20);
    const profile = service.metric === "followers" || service.metric === "subscribers";
    const link = profile ? "@checkouttest" : service.platform === "Instagram" ? "https://www.instagram.com/p/AbCdEf/" : service.platform === "TikTok" ? "https://www.tiktok.com/@checkouttest/video/1234567890123456789" : "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const response = await POST(request({ ...checkout, serviceSlug: service.slug, offerId: offer.id, quantity, link, paymentMethod: method.id, ...(offer.customComments ? { comments: Array.from({length: quantity}, (_, index) => `Comment ${index}`) } : {}) }));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const result = await response.json();
    assert.equal(result.amount, calculateOfferPrice(service, quantity, offer).toFixed(2));
    const order = (await findStoredOrder(result.order))!;
    assert.equal(order.quantity, quantity);
    assert.equal(order.service_slug, service.slug);
    assert.equal(order.offer_id, offer.id);
    assert.equal(order.payment_status, "waiting");
    assert.equal(order.provider_order_id, null);
  });
}

async function paymentEvent(publicId: string, status: string, rawBody = `event-${status}`, amountMatches = true) {
  return recordPaymentEvent({ publicId, paymentStatus: status, rawBody, paymentId: "456", amountMatches, payload: { order_id: publicId, payment_id: "456", payment_status: status, price_currency: "usd", price_amount: 12.99 } });
}

integration("duplicate payment event cannot revive a refunded order", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  await paymentEvent(order.public_id, "refunded");
  await paymentEvent(order.public_id, "finished");
  assert.equal((await findStoredOrder(order.public_id))!.payment_status, "refunded");
  const [count] = await database()`SELECT COUNT(*)::int AS count FROM social_current_payment_events`;
  assert.equal(count.count, 2);
});

integration("a fresh but delayed paid event cannot revive a refunded order", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  await paymentEvent(order.public_id, "refunded");
  await paymentEvent(order.public_id, "confirmed", "delayed-confirmed");
  assert.equal((await findStoredOrder(order.public_id))!.payment_status, "refunded");
});

integration("out-of-order waiting cannot move an expired payment backwards", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "expired");
  await paymentEvent(order.public_id, "waiting");
  assert.equal((await findStoredOrder(order.public_id))!.payment_status, "expired");
});

integration("paid status never regresses when callbacks arrive out of order", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  for (const status of ["waiting", "confirming", "confirmed", "sending", "failed", "expired", "partially_paid"]) {
    await paymentEvent(order.public_id, status);
    assert.equal((await findStoredOrder(order.public_id))!.payment_status, "finished", status);
  }
});

integration("signed unpaid callbacks are accepted once; invalid signatures never change the order", async () => {
  const order = await staleOrder();
  const body = JSON.stringify({ order_id: order.public_id, payment_id: "456", payment_status: "expired", price_amount: 12.99, price_currency: "usd" });
  const sorted = Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b]) => a.localeCompare(b)));
  const signature = createHmac("sha512", "test-signing-secret").update(JSON.stringify(sorted)).digest("hex");
  const callback = (sig: string) => new NextRequest("https://example.com/api/payments/nowpayments", { method: "POST", body, headers: { "x-nowpayments-sig": sig } });
  assert.equal((await webhook(callback("invalid"))).status, 401);
  assert.equal((await findStoredOrder(order.public_id))!.payment_status, "waiting");
  assert.equal((await webhook(callback(signature))).status, 200);
  assert.equal((await webhook(callback(signature))).status, 200);
  assert.equal((await findStoredOrder(order.public_id))!.payment_status, "expired");
  const [count] = await database()`SELECT COUNT(*)::int AS count FROM social_current_payment_events`;
  assert.equal(count.count, 1);
});

function supplier(options: { balance?: string; rate?: string; min?: string; max?: string; missing?: boolean; reject?: boolean; timeout?: boolean; refundOnBalance?: string; refundOnAdd?: string } = {}) {
  let submissions = 0;
  mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    assert.equal(url, "https://smmworldpanel.com/api/v2");
    const params = new URLSearchParams(init!.body as string);
    const action = params.get("action");
    if (action === "balance") {
      if (options.refundOnBalance) await paymentEvent(options.refundOnBalance, "refunded");
      return Response.json({ balance: options.balance ?? "100", currency: "USD" });
    }
    if (action === "services") return Response.json(options.missing ? [] : [{ service: "6669", rate: options.rate ?? "1", min: options.min ?? "100", max: options.max ?? "50000" }]);
    if (action === "add") {
      submissions++;
      if (options.refundOnAdd) await paymentEvent(options.refundOnAdd, "refunded");
      if (options.timeout) throw new Error("Network interrupted after supplier received request");
      if (options.reject) return Response.json({ error: "Order rejected" });
      return Response.json({ order: "supplier-123", status: "Pending" });
    }
    throw new Error(`Unexpected supplier action ${action}`);
  });
  return () => submissions;
}

integration("concurrent fulfillment calls submit a paid order only once", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  const submissions = supplier();
  await Promise.all(Array.from({length: 5}, () => fulfillPaidOrder(order.public_id)));
  assert.equal(submissions(), 1);
  assert.equal((await findStoredOrder(order.public_id))!.fulfillment_status, "submitted");
});

for (const status of ["waiting", "expired", "failed", "partially_paid", "refunded", "amount_mismatch"]) {
  integration(`unpaid ${status} never reaches the supplier`, async () => {
    const order = await staleOrder();
    await paymentEvent(order.public_id, status);
    const submissions = supplier();
    await fulfillPaidOrder(order.public_id);
    assert.equal(submissions(), 0);
    assert.equal((await findStoredOrder(order.public_id))!.provider_order_id, null);
  });
}

integration("insufficient supplier funds queue the order and a funded retry submits it once", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  let submissions = supplier({balance: "0"});
  await fulfillPaidOrder(order.public_id);
  assert.equal(submissions(), 0);
  assert.equal((await findStoredOrder(order.public_id))!.fulfillment_status, "queued_supplier_funds");
  mock.restoreAll();
  submissions = supplier();
  await makeOrderRetryable(order.public_id);
  await fulfillPaidOrder(order.public_id);
  await fulfillPaidOrder(order.public_id);
  assert.equal(submissions(), 1);
});

for (const scenario of [{name:"missing service", missing:true}, {name:"ambiguous timeout", timeout:true}, {name:"supplier rejection", reject:true}]) {
  integration(`${scenario.name} requires review and never automatically resubmits`, async () => {
    const order = await staleOrder();
    await paymentEvent(order.public_id, "finished");
    const submissions = supplier(scenario);
    await fulfillPaidOrder(order.public_id);
    assert.equal((await findStoredOrder(order.public_id))!.fulfillment_status, "manual_review");
    await fulfillPaidOrder(order.public_id);
    assert.equal(submissions(), scenario.missing ? 0 : 1);
  });
}

integration("refund during supplier checks prevents the supplier submission", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  const submissions = supplier({refundOnBalance:order.public_id});
  await fulfillPaidOrder(order.public_id);
  assert.equal(submissions(), 0);
});

for (const range of [{min:"2000",max:"50000"}, {min:"100",max:"500"}]) {
  integration(`supplier quantity limits ${range.min}–${range.max} are enforced before submission`, async () => {
    const order = await staleOrder();
    await paymentEvent(order.public_id, "finished");
    const submissions = supplier(range);
    await fulfillPaidOrder(order.public_id);
    assert.equal(submissions(), 0);
    assert.equal((await findStoredOrder(order.public_id))!.fulfillment_status, "manual_review");
  });
}

integration("negative supplier rates cannot create an order", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  const submissions = supplier({rate:"-1"});
  await fulfillPaidOrder(order.public_id);
  assert.equal(submissions(), 0);
});

for (const contacted of [false, true]) {
  integration(`interrupted worker ${contacted ? "after" : "before"} supplier contact recovers safely`, async () => {
    const order = await staleOrder();
    await paymentEvent(order.public_id, "finished");
    await claimOrderForFulfillment(order.public_id);
    if (contacted) await markSupplierRequestStarted(order.public_id);
    await database()`UPDATE social_current_orders SET updated_at=NOW()-INTERVAL '6 minutes' WHERE public_id=${order.public_id}`;
    const recovered = await reconcileStaleOrder(order.public_id);
    assert.equal(recovered!.fulfillment_status, contacted ? "manual_review" : "retry");
  });
}

integration("malformed order action is rejected as a validation error", async () => {
  assert.equal((await orderAction(new NextRequest("https://example.com/api/order/action", {method:"POST",body:"null"}))).status, 400);
});

integration("refund while supplier submission is in flight retains its reference and requires review", async () => {
  const order = await staleOrder();
  await paymentEvent(order.public_id, "finished");
  const submissions = supplier({refundOnAdd: order.public_id});
  await fulfillPaidOrder(order.public_id);
  const updated = (await findStoredOrder(order.public_id))!;
  assert.equal(submissions(), 1);
  assert.equal(updated.provider_order_id, "supplier-123");
  assert.equal(updated.payment_status, "refunded");
  assert.equal(updated.fulfillment_status, "manual_review");
  await fulfillPaidOrder(order.public_id);
  assert.equal(submissions(), 1);
});

for (const body of ["null", "[]", "42", "invalid JSON"]) {
  integration(`malformed payment update ${body} returns a validation error`, async () => {
    const response = await webhook(new NextRequest("https://example.com/api/payments/nowpayments", {method:"POST", body}));
    assert.equal(response.status, 400);
  });
}

const eventSession="12345678-1234-4234-8234-123456789abc";
const eventId="12345678-1234-4234-8234-123456789abd";
function metricRequest(data:unknown,origin="https://example.com") {
  return new NextRequest("https://example.com/api/checkout/events",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(data)});
}
integration("browser funnel events deduplicate repeated delivery",async()=>{
  const data={event:"package_selected",eventId,sessionId:eventSession,serviceSlug:"instagram-followers",offerId:"usa-female",quantity:200,currency:"usdtbsc"};
  assert.equal((await browserEvent(metricRequest(data))).status,204);
  assert.equal((await browserEvent(metricRequest(data))).status,204);
  const rows=await database()`SELECT * FROM social_current_checkout_events`;
  assert.equal(rows.length,1);
  assert.equal(rows[0].session_id,eventSession);
});
integration("funnel rejects personal fields, forged confirmations and foreign origins",async()=>{
  const data={event:"checkout_opened",eventId,sessionId:eventSession};
  for(const input of [{...data,email:"buyer@example.com"},{...data,targetUrl:"https://instagram.com/creator"},{...data,event:"payment_confirmed"},null]) assert.equal((await browserEvent(metricRequest(input))).status,400);
  assert.equal((await browserEvent(metricRequest(data,"https://foreign.test"))).status,403);
  assert.equal((await browserEvent(metricRequest({...data,offerId:42}))).status,400);
  assert.equal((await browserEvent(metricRequest({...data,offerId:"x".repeat(3000)}))).status,413);
  assert.equal((await database()`SELECT * FROM social_current_checkout_events`).length,0);
});
integration("successful checkout records server stages without customer details",async()=>{
  gateway();
  const response=await POST(request({...checkout,checkoutSession:eventSession}));
  assert.equal(response.status,201);
  const rows=await database()`SELECT * FROM social_current_checkout_events ORDER BY created_at`;
  assert.deepEqual(rows.map(row=>row.event_name),["checkout_submitted","payment_setup_succeeded"]);
  assert.ok(!JSON.stringify(rows).includes(checkout.email));
  assert.ok(!JSON.stringify(rows).includes(checkout.link));
});
integration("minimum failure is classified without creating an order",async()=>{
  gateway({minimum:30});
  assert.equal((await POST(request(checkout))).status,400);
  const rows=await database()`SELECT error_code FROM social_current_checkout_events WHERE event_name='checkout_failed'`;
  assert.equal(rows[0].error_code,"minimum");
  assert.equal((await database()`SELECT * FROM social_current_orders`).length,0);
});
integration("provider initialization failure is captured separately",async()=>{
  gateway({rejectPayment:true});
  assert.equal((await POST(request(checkout))).status,502);
  const rows=await database()`SELECT error_code FROM social_current_checkout_events WHERE event_name='checkout_failed'`;
  assert.equal(rows[0].error_code,"provider_unavailable");
});
integration("confirmed payment is counted once across duplicate and later paid callbacks",async()=>{
  const order=await staleOrder();
  await paymentEvent(order.public_id,"confirmed");
  await paymentEvent(order.public_id,"confirmed");
  await paymentEvent(order.public_id,"finished");
  const funnel=await checkoutFunnel();
  assert.equal(funnel.stages.find(row=>row.event_name==="payment_confirmed")!.events,1);
});
integration("expired tracking supplies a recovery link without exposing customer details",async()=>{
  const order=await staleOrder();
  await paymentEvent(order.public_id,"expired");
  const response=await lookupOrder(new NextRequest(`https://example.com/api/order?order=${order.public_id}`));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.retry_url,`/order?resume=${order.public_id}`);
  assert.equal(data.payment_url,undefined);
  assert.equal(data.email,undefined);
});

integration("restart checks the provider again and refuses a late payment",async()=>{
  const {verifyCheckoutRestart}=await import("../lib/verify-checkout-restart");
  const order=await staleOrder();
  await paymentEvent(order.public_id,"expired");
  mock.method(globalThis,"fetch",async()=>Response.json({order_id:order.public_id,payment_id:order.payment_id,price_amount:12.99,price_currency:"usd",payment_status:"finished",actually_paid:12.99}));
  assert.equal(await verifyCheckoutRestart((await findStoredOrder(order.public_id))!),false);
  assert.equal((await findStoredOrder(order.public_id))!.payment_status,"finished");
});
integration("restart permits a verified zero-paid expired payment and fails closed on outage",async()=>{
  const {verifyCheckoutRestart}=await import("../lib/verify-checkout-restart");
  const order=await staleOrder();
  await paymentEvent(order.public_id,"expired");
  mock.method(globalThis,"fetch",async()=>Response.json({order_id:order.public_id,payment_id:order.payment_id,price_amount:12.99,price_currency:"usd",payment_status:"expired",actually_paid:0}));
  assert.equal(await verifyCheckoutRestart((await findStoredOrder(order.public_id))!),true);
  mock.restoreAll();
  mock.method(globalThis,"fetch",async()=>{throw new Error("offline");});
  await assert.rejects(()=>verifyCheckoutRestart({...order,payment_status:"expired"}),/could not be reached/);
});

const surveyRequest = (body: unknown, origin = "https://example.com") => new NextRequest("https://example.com/api/order/discovery", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
async function surveyOrder(status: string) {
  const id = "SC-261021-ABCDEF0123456789";
  await createStoredOrder({ publicId: id, email: "survey@example.com", serviceSlug: "instagram-followers", offerId: "usa-female", quantity: 200, targetUrl: "https://www.instagram.com/instagram/", comments: [], amountUsd: 15.59 });
  await database()`UPDATE social_current_orders SET payment_status=${status} WHERE public_id=${id}`;
  return id;
}
integration("discovery rejects unpaid, incomplete, refunded, and unknown orders without changing them", async () => {
  const id = await surveyOrder("waiting");
  for (const status of ["creating", "waiting", "confirming", "partially_paid", "amount_mismatch", "expired", "failed", "refunded"]) {
    await database()`UPDATE social_current_orders SET payment_status=${status} WHERE public_id=${id}`;
    const availability = await getDiscovery(new NextRequest(`https://example.com/api/order/discovery?order=${id}`));
    assert.equal((await availability.json()).available, false);
    assert.equal((await answerDiscovery(surveyRequest({ order: id, source: "instagram" }))).status, 409);
    assert.equal((await findStoredOrder(id))?.payment_status, status);
  }
  assert.equal((await answerDiscovery(surveyRequest({ order: "SC-261021-0000000000000000", source: "google" }))).status, 409);
  assert.equal((await discoveryReport()).counts.length, 0);
});
for (const status of ["confirmed", "sending", "finished"]) {
  integration(`discovery accepts ${status} payment once without changing any order fields or contacting providers`, async () => {
    mock.method(globalThis, "fetch", () => { throw new Error("Survey must not contact a provider"); });
    const id = await surveyOrder(status);
    const before = await findStoredOrder(id);
    assert.equal((await (await getDiscovery(new NextRequest(`https://example.com/api/order/discovery?order=${id}`))).json()).available, true);
    const responses = await Promise.all([answerDiscovery(surveyRequest({ order: id, source: "instagram" })), answerDiscovery(surveyRequest({ order: id, source: "google" }))]);
    assert.ok(responses.every(response => response.status === 204));
    assert.deepEqual(await findStoredOrder(id), before);
    assert.equal((await (await getDiscovery(new NextRequest(`https://example.com/api/order/discovery?order=${id}`))).json()).available, false);
    const report = await discoveryReport();
    assert.equal(report.counts.length, 1);
    assert.equal(report.counts[0].answers, 1);
    assert.equal((await answerDiscovery(surveyRequest({ order: id, source: "other", other: "Trying to overwrite" }))).status, 204);
    assert.deepEqual((await discoveryReport()).counts, report.counts);
  });
}
integration("discovery validates origin and input and keeps Other text in the protected report", async () => {
  const id = await surveyOrder("finished");
  assert.equal((await answerDiscovery(surveyRequest({ order: id, source: "google" }, "https://evil.example"))).status, 403);
  for (const body of [null, [], { order: id, source: ["google", "instagram"] }, { order: id, source: "other", other: " " }, { order: id, source: "other", other: "x".repeat(201) }, { order: id, source: "google", payment_status: "finished" }]) {
    assert.equal((await answerDiscovery(surveyRequest(body))).status, 400);
  }
  assert.equal((await answerDiscovery(surveyRequest({ order: id, source: "other", other: "  A newsletter  " }))).status, 204);
  assert.equal((await discoveryReport()).other[0].other_text, "A newsletter");
  const publicResult = await (await getDiscovery(new NextRequest(`https://example.com/api/order/discovery?order=${id}`))).json();
  assert.deepEqual(publicResult, { available: false });
});

integration("a survey storage outage cannot block a paid order or its tracking", async () => {
  const id = await surveyOrder("finished");
  await database()`UPDATE social_current_orders SET fulfillment_status='completed' WHERE public_id=${id}`;
  const before = await findStoredOrder(id);
  await database()`ALTER TABLE social_current_discovery_answers RENAME TO social_current_discovery_answers_outage`;
  try {
    assert.equal((await answerDiscovery(surveyRequest({ order: id, source: "google" }))).status, 503);
    assert.equal((await getDiscovery(new NextRequest(`https://example.com/api/order/discovery?order=${id}`))).status, 503);
    const tracking = await lookupOrder(new NextRequest(`https://example.com/api/order?order=${id}`));
    assert.equal(tracking.status, 200);
    assert.equal((await tracking.json()).payment_status, "finished");
    assert.deepEqual(await findStoredOrder(id), before);
  } finally {
    await database()`ALTER TABLE social_current_discovery_answers_outage RENAME TO social_current_discovery_answers`;
  }
});

integration("discovery accepts same-host browser requests when Next normalizes the internal URL", async () => {
  const id = await surveyOrder("finished");
  const response = await answerDiscovery(new NextRequest("http://localhost:3010/api/order/discovery", {
    method: "POST", headers: { host: "127.0.0.1:3010", origin: "http://127.0.0.1:3010", "Content-Type": "application/json" },
    body: JSON.stringify({ order: id, source: "tiktok" }),
  }));
  assert.equal(response.status, 204);
});
