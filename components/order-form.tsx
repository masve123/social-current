"use client";

import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { calculateOfferPrice, getServiceOffer, getServiceOffers } from "@/lib/smm-offers";
import { services } from "@/lib/services";

export function OrderForm({ initialService, initialQuantity }: { initialService?: string; initialQuantity?: number }) {
  const fallback = services[0];
  const initial = services.find((item) => item.slug === initialService) || fallback;
  const [serviceSlug, setServiceSlug] = useState(initial.slug);
  const service = services.find((item) => item.slug === serviceSlug) || fallback;
  const offers = getServiceOffers(service);
  const [offerId, setOfferId] = useState(offers[0].id);
  const offer = getServiceOffer(service, offerId);
  const offerMin = offer.min ?? service.min;
  const offerMax = offer.max ?? service.max;
  const offerStep = offer.step ?? service.step;
  const [quantity, setQuantity] = useState(
    initialQuantity && initialQuantity >= initial.min && initialQuantity <= initial.max ? initialQuantity : initial.baseQuantity,
  );
  const [commentsText, setCommentsText] = useState("");
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const comments = useMemo(() => commentsText.split("\n").map((item) => item.trim()).filter(Boolean), [commentsText]);
  const pricedQuantity = offer.customComments ? Math.max(offerMin, comments.length) : quantity;
  const price = calculateOfferPrice(service, pricedQuantity, offer);

  function changeService(slug: string) {
    const next = services.find((item) => item.slug === slug) || fallback;
    setServiceSlug(slug);
    setOfferId(getServiceOffers(next)[0].id);
    setQuantity(next.baseQuantity);
    setCommentsText("");
    setState("idle");
  }

  function changeOffer(id: string) {
    const next = getServiceOffer(service, id);
    const min = next.min ?? service.min;
    const max = next.max ?? service.max;
    setOfferId(next.id);
    setQuantity((current) => Math.min(max, Math.max(min, current)));
    setState("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlug, offerId: offer.id, quantity: offer.customComments ? comments.length : quantity, comments, link, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We could not place the order.");
      setState("success");
      setMessage(`Order ${data.order} was created for $${data.amount}. Save this number to track delivery.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "We could not place the order.");
    }
  }

  return (
    <form className="checkout" onSubmit={submit}>
      <div className="checkout__main">
        <div className="form-section">
          <span className="step-number">01</span>
          <div><h2>Select a service</h2><p>Choose the platform and metric you want to grow.</p></div>
        </div>
        <div className="service-options">
          {services.map((item) => (
            <button className={serviceSlug === item.slug ? "active" : ""} type="button" key={item.slug} onClick={() => changeService(item.slug)}>
              <span>{item.platform}</span><strong>{item.metric}</strong>
            </button>
          ))}
        </div>

        <div className="form-section form-section--spaced">
          <span className="step-number">02</span>
          <div><h2>Choose a package</h2><p>Each package maps to a provider service with matching targeting and protection.</p></div>
        </div>
        <div className="package-options">
          {offers.map((item) => (
            <button type="button" key={item.id} className={offer.id === item.id ? "active" : ""} onClick={() => changeOffer(item.id)}>
              <span className="package-options__heading"><strong>{item.label}</strong><small>{item.quality}</small></span>
              <span>{item.description}</span>
              <span className="package-options__facts"><small>{item.audience}</small><small>{item.delivery}</small><small>{item.protection}</small></span>
            </button>
          ))}
        </div>

        <div className="form-section form-section--spaced">
          <span className="step-number">03</span>
          <div><h2>{offer.customComments ? "Write your comments" : "Choose the amount"}</h2><p>{offer.customComments ? `Add one comment per line, in multiples of ${offerStep}.` : "Use the slider for a package that fits your campaign."}</p></div>
        </div>
        {offer.customComments ? (
          <label className="comments-field">
            <span>Comments <strong>{comments.length.toLocaleString()}</strong></span>
            <textarea value={commentsText} onChange={(event) => setCommentsText(event.target.value)} rows={8} placeholder={"Love this perspective!\nThis was really helpful.\nGreat work on this one."} required />
          </label>
        ) : (
          <>
            <label className="range-label" htmlFor="order-quantity"><span>Quantity</span><strong>{quantity.toLocaleString()}</strong></label>
            <input id="order-quantity" className="range" type="range" min={offerMin} max={offerMax} step={offerStep} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </>
        )}

        <div className="form-section form-section--spaced">
          <span className="step-number">04</span>
          <div><h2>Where should we deliver?</h2><p>Your account or post needs to be public during delivery.</p></div>
        </div>
        <div className="field-grid">
          <label><span>Public profile or post URL</span><input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://instagram.com/yourprofile" required /></label>
          <label><span>Order email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
        </div>
      </div>
      <aside className="order-summary">
        <span className="eyebrow">Order summary</span>
        <h2>{service.shortTitle}</h2>
        <div className="summary-row"><span>Package</span><strong>{offer.label}</strong></div>
        <div className="summary-row"><span>Audience</span><strong>{offer.audience}</strong></div>
        <div className="summary-row"><span>Quantity</span><strong>{(offer.customComments ? comments.length : quantity).toLocaleString()}</strong></div>
        <div className="summary-row"><span>Protection</span><strong>{offer.protection}</strong></div>
        <div className="summary-total"><span>Total</span><strong>${price.toFixed(2)}</strong></div>
        <button className="button button--coral button--wide" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <><LoaderCircle className="spin" /> Creating order</> : <>Continue <ArrowRight /></>}
        </button>
        <p className="secure-note"><LockKeyhole aria-hidden="true" /> Encrypted and private. No password required.</p>
        {message && <div className={`form-message form-message--${state}`} role="status">{state === "success" && <CheckCircle2 />} {message}</div>}
        <p className="checkout-note">Provider fulfillment begins only after secure payment confirmation.</p>
      </aside>
    </form>
  );
}
