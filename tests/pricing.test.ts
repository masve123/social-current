import assert from "node:assert/strict";
import { test } from "node:test";
import { services, calculatePrice, getService } from "../lib/services";
import { getServiceOffers, calculateOfferPrice } from "../lib/smm-offers";
import { getCheckoutMinimumQuantity, normalizeCheckoutQuantity } from "../lib/checkout-pricing";

test("USA female and male prices increase at 100, 200 and 300 followers", () => {
  const service = getService("instagram-followers")!;
  for (const offer of getServiceOffers(service).filter((offer) => ["usa-female", "usa-male"].includes(offer.id))) {
    assert.deepEqual([100, 200, 300].map((quantity) => calculateOfferPrice(service, quantity, offer).toFixed(2)), ["7.79", "15.59", "23.38"]);
  }
});

test("every offered quantity has a higher total than the previous quantity, including discount boundaries", () => {
  for (const service of services) {
    for (const offer of getServiceOffers(service)) {
      const step = offer.step ?? service.step;
      let previous = -1;
      for (let quantity = offer.min ?? service.min; quantity <= (offer.max ?? service.max); quantity += step) {
        const cents = Math.round(calculateOfferPrice(service, quantity, offer) * 100);
        assert.ok(cents > previous, `${service.slug}/${offer.id} at ${quantity}: ${cents} <= ${previous}`);
        previous = cents;
      }
    }
  }
});

test("bulk anchor prices remain intact", () => {
  const service = getService("instagram-followers")!;
  assert.deepEqual([1, 2, 5, 10].map((factor) => calculatePrice(service, service.baseQuantity * factor).toFixed(2)), ["12.99", "24.68", "58.45", "109.12"]);
});

test("all checkout minimums are valid increments and actually cover the minimum", () => {
  for (const service of services) for (const offer of getServiceOffers(service)) {
    for (const minimum of [4.99, 13.37, 24.01]) {
      const quantity = getCheckoutMinimumQuantity(service, offer, minimum);
      assert.equal(quantity % (offer.step ?? service.step), 0);
      assert.ok(quantity >= (offer.min ?? service.min));
      assert.ok(quantity <= (offer.max ?? service.max));
      assert.ok(Number(calculateOfferPrice(service, quantity, offer).toFixed(2)) >= minimum);
    }
  }
});

test("switching to an offer with a larger step rounds the quantity to a valid order", () => {
  const service = getService("youtube-views")!;
  const targeted = getServiceOffers(service).find((offer) => offer.id === "usa")!;
  assert.equal(normalizeCheckoutQuantity(service, targeted, 500), 1000);
  assert.equal(normalizeCheckoutQuantity(service, targeted, 100001), 100000);
});
