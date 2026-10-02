"use client";

import { ArrowRight, CheckCircle2, ExternalLink, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateOfferPrice, getServiceOffer, getServiceOffers } from "@/lib/smm-offers";
import { getCheckoutMinimumQuantity, minimumCheckoutUsd } from "@/lib/checkout-pricing";
import { services } from "@/lib/services";
import { isProfileService, parseProfileTarget } from "@/lib/profile-target";

type ProfileCheck = { status: "verified" | "not_found" | "unavailable" | "invalid"; url?: string; displayName?: string };

export function OrderForm({ initialService, initialQuantity }: { initialService?: string; initialQuantity?: number }) {
  const fallback = services[0];
  const initial = services.find((item) => item.slug === initialService) || fallback;
  const [serviceSlug, setServiceSlug] = useState(initial.slug);
  const service = services.find((item) => item.slug === serviceSlug) || fallback;
  const offers = getServiceOffers(service);
  const [offerId, setOfferId] = useState(offers[0].id);
  const offer = getServiceOffer(service, offerId);
  const offerMin = getCheckoutMinimumQuantity(service, offer);
  const offerMax = offer.max ?? service.max;
  const offerStep = offer.step ?? service.step;
  const [quantity, setQuantity] = useState(
    initialQuantity && initialQuantity >= getCheckoutMinimumQuantity(initial, getServiceOffers(initial)[0]) && initialQuantity <= initial.max
      ? initialQuantity
      : Math.max(initial.baseQuantity, getCheckoutMinimumQuantity(initial, getServiceOffers(initial)[0])),
  );
  const [commentsText, setCommentsText] = useState("");
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"usdtbsc" | "any">("usdtbsc");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [profileCheck, setProfileCheck] = useState<ProfileCheck | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const comments = useMemo(() => commentsText.split("\n").map((item) => item.trim()).filter(Boolean), [commentsText]);
  const pricedQuantity = offer.customComments ? Math.max(offerMin, comments.length) : quantity;
  const price = calculateOfferPrice(service, pricedQuantity, offer);
  const profileService = isProfileService(service);
  const parsedProfile = profileService ? parseProfileTarget(service.platform, link) : null;
  const quantityPresets = [...new Set([offerMin, service.baseQuantity, service.baseQuantity * 2, service.baseQuantity * 5]
    .map((value) => Math.min(offerMax, Math.max(offerMin, Math.round(value / offerStep) * offerStep))))];

  useEffect(() => {
    if (!profileService || !link.trim() || !parsedProfile) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCheckingProfile(true);
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: service.platform, target: link }),
          signal: controller.signal,
        });
        const result = await response.json() as ProfileCheck;
        if (!controller.signal.aborted) setProfileCheck(result);
      } catch {
        if (!controller.signal.aborted) setProfileCheck({ status: "unavailable" });
      } finally {
        if (!controller.signal.aborted) setCheckingProfile(false);
      }
    }, 600);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [link, parsedProfile?.url, profileService, service.platform]);

  function changeService(slug: string) {
    const next = services.find((item) => item.slug === slug) || fallback;
    setServiceSlug(slug);
    setOfferId(getServiceOffers(next)[0].id);
    setQuantity(Math.max(next.baseQuantity, getCheckoutMinimumQuantity(next, getServiceOffers(next)[0])));
    setCommentsText("");
    setLink("");
    setProfileCheck(null);
    setCheckingProfile(false);
    setState("idle");
  }

  function changeOffer(id: string) {
    const next = getServiceOffer(service, id);
    const min = getCheckoutMinimumQuantity(service, next);
    const max = next.max ?? service.max;
    setOfferId(next.id);
    setQuantity((current) => Math.min(max, Math.max(min, current)));
    setState("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileService && (!parsedProfile || profileCheck?.status === "not_found")) {
      setState("error");
      setMessage(profileCheck?.status === "not_found" ? "That profile could not be found. Check the username before paying." : "Enter a valid profile username or URL.");
      return;
    }
    if (price < minimumCheckoutUsd || (offer.customComments && comments.length < offerMin)) {
      setState("error");
      setMessage(`Orders must total at least $${minimumCheckoutUsd.toFixed(2)}. Increase the quantity${offer.customComments ? " or add more comments" : ""} to continue.`);
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlug, offerId: offer.id, quantity: offer.customComments ? comments.length : quantity, comments, link, email, paymentMethod, acceptedTerms: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We could not place the order.");
      setState("success");
      setMessage(`Order ${data.order} was created. Opening secure payment…`);
      window.location.assign(data.checkout_url);
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
          <div><h2>{offer.customComments ? "Write your comments" : "Choose the amount"}</h2><p>{offer.customComments ? `Add at least ${offerMin} comments, one per line, in multiples of ${offerStep}.` : "Use the slider for a package that fits your campaign."}</p></div>
        </div>
        {offer.customComments ? (
          <label className="comments-field">
            <span>Comments <strong>{comments.length.toLocaleString()}</strong></span>
            <textarea value={commentsText} onChange={(event) => setCommentsText(event.target.value)} rows={8} placeholder={"Love this perspective!\nThis was really helpful.\nGreat work on this one."} required />
          </label>
        ) : (
          <>
            <div className="quantity-presets" aria-label="Popular quantities">
              {quantityPresets.map((preset) => (
                <button key={preset} type="button" aria-pressed={quantity === preset} onClick={() => setQuantity(preset)}>
                  <strong>{preset.toLocaleString()}</strong><small>${calculateOfferPrice(service, preset, offer).toFixed(2)}</small>
                </button>
              ))}
            </div>
            <label className="range-label" htmlFor="order-quantity"><span>Quantity</span><strong>{quantity.toLocaleString()}</strong></label>
            <input id="order-quantity" className="range" type="range" min={offerMin} max={offerMax} step={offerStep} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </>
        )}

        <div className="form-section form-section--spaced">
          <span className="step-number">04</span>
          <div><h2>Where should we deliver?</h2><p>{profileService ? "Enter your username. We will check the public profile before payment when the platform allows it." : "Paste the public post or video URL. It needs to remain public during delivery."}</p></div>
        </div>
        <div className="field-grid">
          <div className="target-field">
            <label><span>{profileService ? `${service.platform} username or profile URL` : "Public post or video URL"}</span><input type={profileService ? "text" : "url"} value={link} onChange={(event) => { setLink(event.target.value); setProfileCheck(null); setCheckingProfile(false); }} placeholder={profileService ? "@yourusername" : `https://${service.platform === "Instagram" ? "instagram.com/p/..." : service.platform === "TikTok" ? "tiktok.com/@user/video/..." : "youtube.com/watch?v=..."}`} autoComplete="off" required /></label>
            {profileService && link.trim() && (
              <div className={`profile-check profile-check--${checkingProfile ? "checking" : profileCheck?.status || (parsedProfile ? "checking" : "invalid")}`} role="status">
                {checkingProfile || (!profileCheck && parsedProfile) ? "Checking this public profile…" : profileCheck?.status === "verified" ? `Profile found${profileCheck.displayName ? `: ${profileCheck.displayName}` : ""}` : profileCheck?.status === "not_found" ? "Profile not found. Check the username." : !parsedProfile ? "Enter a valid username or profile URL." : "We could not verify automatically. Confirm the profile before paying."}
                {parsedProfile && profileCheck?.status !== "not_found" && <a href={parsedProfile.url} target="_blank" rel="noopener noreferrer">View profile <ExternalLink aria-hidden="true" /></a>}
              </div>
            )}
          </div>
          <label><span>Email for order updates</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
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
        <fieldset className="payment-methods">
          <legend>How would you like to pay?</legend>
          <label className={paymentMethod === "usdtbsc" ? "payment-methods__option payment-methods__option--active" : "payment-methods__option"}>
            <input type="radio" name="payment-method" value="usdtbsc" checked={paymentMethod === "usdtbsc"} onChange={() => setPaymentMethod("usdtbsc")} />
            <span><strong>USDT on BNB Smart Chain</strong><small>BSC network · Suggested</small></span>
          </label>
          <label className={paymentMethod === "any" ? "payment-methods__option payment-methods__option--active" : "payment-methods__option"}>
            <input type="radio" name="payment-method" value="any" checked={paymentMethod === "any"} onChange={() => setPaymentMethod("any")} />
            <span><strong>Other cryptocurrency</strong><small>Choose a supported coin at payment</small></span>
          </label>
        </fieldset>
        {paymentMethod === "usdtbsc" && <p className="checkout-note">Send USDT on the BNB Smart Chain network only. Other networks cannot be used for this option.</p>}
        <p className="checkout-note">No account or password needed. We cover provider processing fees; your wallet may charge a network fee to send crypto.</p>
        <label className="checkout-consent">
          <input type="checkbox" required />
          <span>I agree to the <Link href="/terms" target="_blank">terms</Link> and <Link href="/refund-policy" target="_blank">refund policy</Link>.</span>
        </label>
        <button className="button button--coral button--wide" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <><LoaderCircle className="spin" /> Opening payment</> : <>Pay securely <ArrowRight /></>}
        </button>
        <p className="secure-note"><LockKeyhole aria-hidden="true" /> Encrypted and private. No password required.</p>
        {message && <div className={`form-message form-message--${state}`} role="status">{state === "success" && <CheckCircle2 />} {message}</div>}
        <p className="checkout-note">Fulfillment begins only after secure payment confirmation.</p>
      </aside>
    </form>
  );
}
