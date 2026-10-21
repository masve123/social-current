"use client";

import Link from "next/link";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { type Service } from "@/lib/services";
import { getCheckoutMinimumQuantity, normalizeCheckoutQuantity } from "@/lib/checkout-pricing";
import { calculateOfferPrice, getServiceOffers } from "@/lib/smm-offers";

export function PackagePicker({ service }: { service: Service }) {
  const offers = getServiceOffers(service);
  const [offerId, setOfferId] = useState(offers[0].id);
  const offer = offers.find((item) => item.id === offerId) || offers[0];
  const minQuantity = getCheckoutMinimumQuantity(service, offer);
  const maxQuantity = offer.max ?? service.max;
  const step = offer.step ?? service.step;
  const presets = (() => {
    const values = [service.baseQuantity / 2, service.baseQuantity, service.baseQuantity * 2.5, service.baseQuantity * 5];
    return [...new Set(values.map((value) => Math.max(minQuantity, Math.min(maxQuantity, Math.round(value / step) * step))))];
  })();
  const [quantity, setQuantity] = useState(Math.max(service.baseQuantity, minQuantity));
  const selectedQuantity = normalizeCheckoutQuantity(service, offer, quantity);
  const price = calculateOfferPrice(service, offer.customComments ? minQuantity : selectedQuantity, offer);
  const checkoutParams = new URLSearchParams({ service: service.slug, offer: offer.id, quantity: String(selectedQuantity) });

  return (
    <aside className="picker" aria-label={`${service.shortTitle} package picker`}>
      <div className="picker__header">
        <span>{service.metric === "followers" ? "Build your follower package" : "Choose your amount"}</span>
      </div>
      {service.metric === "followers" && offers.length > 1 && (
        <fieldset className="picker__follower-types">
          <legend>Choose your follower type</legend>
          <div className="picker__follower-grid">
            {offers.map((item) => {
              const itemQuantity = normalizeCheckoutQuantity(service, item, selectedQuantity);
              return (
                <button type="button" key={item.id} className={offer.id === item.id ? "active" : ""} aria-pressed={offer.id === item.id} onClick={() => { setQuantity(normalizeCheckoutQuantity(service, item, selectedQuantity)); setOfferId(item.id); }}>
                  <strong>{item.label}</strong>
                  <small>{item.audience} · {item.protection}</small>
                  <small>For {itemQuantity.toLocaleString("en-US")} followers</small>
                  <span>${calculateOfferPrice(service, itemQuantity, item).toFixed(2)}</span>
                </button>
              );
            })}
          </div>
          <p>{offer.description}</p>
        </fieldset>
      )}
      {service.metric !== "followers" && offers.length > 1 && (
        <div className="picker__tier">
          <label htmlFor="package-tier">Delivery package</label>
          <select id="package-tier" value={offer.id} onChange={(event) => { const next = offers.find((item) => item.id === event.target.value)!; setQuantity(normalizeCheckoutQuantity(service, next, selectedQuantity)); setOfferId(next.id); }}>
            {offers.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
          <p>{offer.description} {offer.protection}.</p>
        </div>
      )}
      {offer.customComments ? (
        <p className="picker__custom-note">You’ll enter your comment text at checkout. The total updates with the number of comments.</p>
      ) : (
        <>
          <div className="picker__presets">
            {presets.map((preset) => (
              <button
                className={selectedQuantity === preset ? "active" : ""}
                type="button"
                key={preset}
                aria-pressed={selectedQuantity === preset}
                onClick={() => setQuantity(preset)}
              >
                <strong>{preset.toLocaleString("en-US")}</strong>
                <span>{service.metric}</span>
              </button>
            ))}
          </div>
          <label className="range-label" htmlFor="quantity">
            <span>Custom amount</span><strong aria-live="polite">{selectedQuantity.toLocaleString("en-US")}</strong>
          </label>
          <input
            id="quantity"
            className="range"
            type="range"
            min={minQuantity}
            max={maxQuantity}
            step={step}
            value={selectedQuantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </>
      )}
      <div className="picker__total"><span>{offer.customComments ? "Starting at" : "Total"}</span><strong aria-live="polite">${price.toFixed(2)}</strong></div>
      <p className="checkout-note">We cover payment processing fees. Your wallet may charge a fee to send crypto.</p>
      <Link className="button button--coral button--wide" href={`/order?${checkoutParams.toString()}`}>
        {offer.customComments ? "Write your comments" : "Continue with this package"}
      </Link>
      <div className="picker__trust">
        <span><Clock3 aria-hidden="true" /> {service.delivery}</span>
        <span><ShieldCheck aria-hidden="true" /> Secure checkout</span>
        <span><Check aria-hidden="true" /> {offer.protection}</span>
      </div>
    </aside>
  );
}
