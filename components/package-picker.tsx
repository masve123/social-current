"use client";

import Link from "next/link";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { type Service } from "@/lib/services";
import { getCheckoutMinimumQuantity, normalizeCheckoutQuantity } from "@/lib/checkout-pricing";
import { calculateOfferPrice, getServiceOffers } from "@/lib/smm-offers";

import { usePaymentMinimum } from "@/lib/use-payment-minimum";
import { paymentMethods, type PaymentCurrency } from "@/lib/payment-methods";
import { trackCheckout } from "@/lib/checkout-telemetry";

export function PackagePicker({ service }: { service: Service }) {
  const [currency, setCurrency] = useState<PaymentCurrency>("usdtbsc");
  const [refresh,setRefresh] = useState(0);
  const quote = usePaymentMinimum(currency,refresh);
  const minimumUsd = Math.max(4.99,quote?.minimum ?? 4.99);
  const offers = getServiceOffers(service);
  const [offerId, setOfferId] = useState(offers[0].id);
  const offer = offers.find((item) => item.id === offerId) || offers[0];
  const minQuantity = getCheckoutMinimumQuantity(service, offer, minimumUsd);
  const maxQuantity = offer.max ?? service.max;
  const step = offer.step ?? service.step;
  const presets = (() => {
    const values = [minQuantity, minQuantity + step, service.baseQuantity / 2, service.baseQuantity, service.baseQuantity * 2.5, service.baseQuantity * 5];
    return [...new Set(values.map((value) => Math.max(minQuantity, Math.min(maxQuantity, Math.round(value / step) * step))))].sort((a,b)=>a-b).slice(0,4);
  })();
  const [quantity, setQuantity] = useState(minQuantity);
  const [quantityChosen, setQuantityChosen] = useState(false);
  const selectedQuantity = normalizeCheckoutQuantity(service, offer, quantityChosen ? quantity : 0, minimumUsd);
  const price = calculateOfferPrice(service, offer.customComments ? minQuantity : selectedQuantity, offer);
  const checkoutParams = new URLSearchParams({ service: service.slug, offer: offer.id, quantity: String(selectedQuantity), currency });
  const available = Boolean(quote?.minimum) && Number(price.toFixed(2)) >= minimumUsd;
  useEffect(() => {
    if (!available) return;
    const timer = setTimeout(() => trackCheckout({event:"package_selected",serviceSlug:service.slug,offerId:offer.id,quantity:selectedQuantity,currency}),400);
    return () => clearTimeout(timer);
  },[service.slug,offer.id,selectedQuantity,currency,available]);

  return (
    <aside id="packages" className="picker" aria-label={`${service.shortTitle} package picker`}>
      <div className="picker__header">
        <span>{service.metric === "followers" ? "Build your follower package" : "Choose your amount"}</span>
      </div>
      <div className="picker__tier">
        <label htmlFor="package-payment">Pay from your wallet or exchange</label>
        <select id="package-payment" value={currency} onChange={event=>setCurrency(event.target.value as PaymentCurrency)}>
          {paymentMethods.map(method=><option key={method.id} value={method.id}>{method.label}</option>)}
        </select>
        {quote?.error && <button type="button" onClick={()=>setRefresh(value=>value+1)}>Check payment again</button>}
        <p>Crypto payment. {quote?.minimum ? `Current minimum: $${quote.minimum.toFixed(2)}. Choose a package above this amount.` : quote?.error || "Checking payment availability…"}</p>
      </div>
      {service.metric === "followers" && offers.length > 1 && (
        <fieldset className="picker__follower-types">
          <legend>Choose your follower type</legend>
          <div className="picker__follower-grid">
            {offers.map((item) => {
              const itemQuantity = normalizeCheckoutQuantity(service, item, quantityChosen ? selectedQuantity : 0, minimumUsd);
              return (
                <button type="button" key={item.id} className={offer.id === item.id ? "active" : ""} aria-pressed={offer.id === item.id} onClick={() => { setQuantity(normalizeCheckoutQuantity(service, item, quantityChosen ? selectedQuantity : 0, minimumUsd)); setOfferId(item.id); }}>
                  <strong>{item.label}</strong>
                  <small>{item.audience} · {item.protection}</small>
                  <small>For {itemQuantity.toLocaleString("en-US")} followers</small>
                  <span>{quote?.minimum && Number(calculateOfferPrice(service,itemQuantity,item).toFixed(2)) >= minimumUsd ? `$${calculateOfferPrice(service,itemQuantity,item).toFixed(2)}` : quote ? "Unavailable" : "Checking…"}</span>
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
          <select id="package-tier" value={offer.id} onChange={(event) => { const next = offers.find((item) => item.id === event.target.value)!; setQuantity(normalizeCheckoutQuantity(service, next, quantityChosen ? selectedQuantity : 0, minimumUsd)); setOfferId(next.id); }}>
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
                onClick={() => {setQuantity(preset);setQuantityChosen(true);}}
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
            onChange={(event) => {setQuantity(Number(event.target.value));setQuantityChosen(true);}}
          />
        </>
      )}
      <div className="picker__total"><span>{offer.customComments ? "Starting at" : "Total"}</span><strong aria-live="polite">{available ? `$${price.toFixed(2)}` : quote ? "Unavailable" : "Checking…"}</strong></div>
      <p className="checkout-note"><Link href={`/how-to-pay#${currency}`} target="_blank" rel="noopener noreferrer">How to pay with crypto ↗</Link></p>
      <p className="checkout-note">We cover payment processing fees. Your wallet may charge a fee to send crypto.</p>
      {available ? <Link className="button button--coral button--wide" href={`/order?${checkoutParams.toString()}`}>
        {offer.customComments ? "Write your comments" : "Continue with this package"}
      </Link> : <button className="button button--coral button--wide" disabled>{quote ? "Payment unavailable" : "Checking payment…"}</button>}
      <div className="picker__trust">
        <span><Clock3 aria-hidden="true" /> {service.delivery}</span>
        <span><ShieldCheck aria-hidden="true" /> Secure checkout</span>
        <span><Check aria-hidden="true" /> {offer.protection}</span>
      </div>
    </aside>
  );
}
