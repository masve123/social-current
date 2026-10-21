import assert from "node:assert/strict";
import { test } from "node:test";
import { canRestartCheckout, checkoutRecoveryUrl } from "../lib/checkout-recovery";
import { parseCheckoutDraft } from "../lib/checkout-draft";
import type { StoredOrder } from "../lib/order-store";
import { services } from "../lib/services";
import { getServiceOffers, calculateOfferPrice } from "../lib/smm-offers";
import { normalizeCheckoutQuantity } from "../lib/checkout-pricing";
const expired = {public_id:"SC-261021-ABCDEF1234567890",payment_status:"expired",paid_at:null,provider_order_id:null,supplier_request_started_at:null,payment_payload:{actually_paid:0}} as unknown as StoredOrder;
test("expired unpaid order can reopen checkout with its opaque reference",()=>{
  assert.equal(checkoutRecoveryUrl(expired),"/order?resume=SC-261021-ABCDEF1234567890");
});
for(const status of ["waiting","confirming","confirmed","sending","finished","partially_paid","refunded","amount_mismatch"]) {
  test(`${status} order cannot start a replacement payment`,()=>assert.equal(canRestartCheckout({...expired,payment_status:status}),false));
}
for(const state of [{paid_at:new Date("2026-10-21")},{provider_order_id:"supplier"},{supplier_request_started_at:new Date("2026-10-21")},{payment_payload:{actually_paid:0.1}},{payment_payload:{actually_paid:"invalid"}}]) {
  test(`recovery blocks ${Object.keys(state)[0]} ${JSON.stringify(state)}`,()=>assert.equal(canRestartCheckout({...expired,...state}),false));
}
const draft={serviceSlug:"instagram-followers",offerId:"usa-female",quantity:200,commentsText:"",link:"@creator",email:"buyer@example.com",paymentMethod:"usdtbsc",savedAt:1000};
test("checkout draft preserves entered details within one hour",()=>assert.deepEqual(parseCheckoutDraft(JSON.stringify(draft),2000),draft));
test("expired or corrupt drafts are ignored",()=>{
  for(const input of ["null","{}","invalid",JSON.stringify({...draft,savedAt:10_000}),JSON.stringify({...draft,email:42}),JSON.stringify({...draft,quantity:NaN})]) assert.equal(parseCheckoutDraft(input,2000),null);
  assert.equal(parseCheckoutDraft(JSON.stringify(draft),3_601_001),null);
});
test("all displayed package quantities cover the selected method minimum when available",()=>{
  for(const service of services) for(const offer of getServiceOffers(service)) for(const minimum of [6,14.48,20,30,100]) {
    const quantity=normalizeCheckoutQuantity(service,offer,service.min,minimum);
    assert.ok(quantity<=(offer.max ?? service.max));
    assert.equal(quantity % (offer.step ?? service.step),0);
    if(quantity<(offer.max ?? service.max)) assert.ok(Number(calculateOfferPrice(service,quantity,offer).toFixed(2))>=minimum,`${service.slug}/${offer.id}/${minimum}`);
  }
});
