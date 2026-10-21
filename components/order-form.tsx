"use client";

import { CryptoPaymentHelp } from "@/components/crypto-payment-help";
import { ArrowRight, CheckCircle2, ExternalLink, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { calculateOfferPrice, getServiceOffer, getServiceOffers } from "@/lib/smm-offers";
import { getCheckoutMinimumQuantity, minimumCheckoutUsd, normalizeCheckoutQuantity } from "@/lib/checkout-pricing";
import { isPaymentCurrency, paymentMethods, type PaymentCurrency } from "@/lib/payment-methods";
import { services } from "@/lib/services";
import { isProfileService, parseProfileTarget, parseOrderTarget } from "@/lib/profile-target";

import { usePaymentMinimum } from "@/lib/use-payment-minimum";
import { checkoutDraftKey, parseCheckoutDraft, persistCheckoutDraft } from "@/lib/checkout-draft";
import { checkoutSessionId, trackCheckout } from "@/lib/checkout-telemetry";

type ProfileCheck = { status: "verified" | "not_found" | "private" | "unavailable" | "invalid"; url?: string; displayName?: string };

export function OrderForm({ initialService, initialOffer, initialQuantity, initialCurrency, initialLink = "", initialComments = "", resumeOrder, emailUpdatesEnabled = false, instagramLookupEnabled = false }: { initialService?: string; initialOffer?: string; initialQuantity?: number; initialCurrency?: string; initialLink?: string; initialComments?: string; resumeOrder?: string; emailUpdatesEnabled?: boolean; instagramLookupEnabled?: boolean }) {
  const selectionKey = JSON.stringify([initialService,initialOffer,initialQuantity,initialCurrency,resumeOrder]);
  const fallback = services[0];
  const initial = services.find((item) => item.slug === initialService) || fallback;
  const hasSelectedPackage = Boolean(services.find((item) => item.slug === initialService));
  const firstOffer = getServiceOffer(initial, initialOffer);
  const firstOfferMin = getCheckoutMinimumQuantity(initial, firstOffer);
  const firstOfferMax = firstOffer.max ?? initial.max;
  const firstOfferStep = firstOffer.step ?? initial.step;
  const [serviceSlug, setServiceSlug] = useState(initial.slug);
  const service = services.find((item) => item.slug === serviceSlug) || fallback;
  const offers = getServiceOffers(service);
  const [offerId, setOfferId] = useState(firstOffer.id);
  const offer = getServiceOffer(service, offerId);
  const offerMin = getCheckoutMinimumQuantity(service, offer);
  const offerMax = offer.max ?? service.max;
  const offerStep = offer.step ?? service.step;
  const [quantityInput, setQuantity] = useState(
    initialQuantity && initialQuantity >= firstOfferMin && initialQuantity <= firstOfferMax && initialQuantity % firstOfferStep === 0
      ? initialQuantity
      : normalizeCheckoutQuantity(initial, firstOffer, 0),
  );
  const [editingPackage, setEditingPackage] = useState(!hasSelectedPackage);
  const [commentsText, setCommentsText] = useState(initialComments);
  const [link, setLink] = useState(initialLink);
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentCurrency>(isPaymentCurrency(initialCurrency) ? initialCurrency : "usdtbsc");
  const [minimumRefresh, setMinimumRefresh] = useState(0);
  const paymentQuote = usePaymentMinimum(paymentMethod, minimumRefresh);
  const [serverMinimum, setServerMinimum] = useState<{currency:PaymentCurrency; minimum:number} | null>(null);
  const paymentMinimum = paymentQuote && {...paymentQuote, minimum: Math.max(paymentQuote.minimum || 0, serverMinimum?.currency === paymentMethod ? serverMinimum.minimum : 0) || undefined};
  const [draftReady, setDraftReady] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [earlierOrder,setEarlierOrder] = useState<string | undefined>();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const [profileCheck, setProfileCheck] = useState<ProfileCheck | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const comments = useMemo(() => commentsText.split("\n").map((item) => item.trim()).filter(Boolean), [commentsText]);
  const checkingPayment = paymentMinimum?.currency !== paymentMethod;
  const requiredMinimum = Math.max(minimumCheckoutUsd, paymentMinimum?.currency === paymentMethod ? paymentMinimum.minimum ?? minimumCheckoutUsd : minimumCheckoutUsd);
  const requiredQuantity = getCheckoutMinimumQuantity(service, offer, requiredMinimum);
  const quantity = initialQuantity !== undefined ? quantityInput : normalizeCheckoutQuantity(service,offer,quantityInput,requiredMinimum);
  const pricedQuantity = offer.customComments ? comments.length : quantity;
  const price = calculateOfferPrice(service, pricedQuantity, offer);
  const belowPaymentMinimum = Number(price.toFixed(2)) < requiredMinimum;
  const profileService = isProfileService(service);
  const checkProfileAutomatically = profileService && (service.platform !== "Instagram" || instagramLookupEnabled);
  const activeGoal = service.metric === "subscribers" ? "followers" : service.metric;
  const parsedProfile = profileService ? parseProfileTarget(service.platform, link) : null;
  const quantityPresets = [...new Set([requiredQuantity, service.baseQuantity, service.baseQuantity * 2, service.baseQuantity * 5]
    .map((value) => Math.min(offerMax, Math.max(requiredQuantity, Math.round(value / offerStep) * offerStep))))];

  useEffect(() => {
    let draft;
    try {draft=parseCheckoutDraft(sessionStorage.getItem(resumeOrder ? `${checkoutDraftKey}:${resumeOrder}` : checkoutDraftKey));} catch {}
    // Restore once after hydration; browser-only storage is unavailable on the server.
    if(draft) {
      /* eslint-disable react-hooks/set-state-in-effect */
      if(draft.order && /^SC-\d{6}-[A-F0-9]{16}$/.test(draft.order)) setEarlierOrder(draft.order);
      const matchesResume = !resumeOrder || draft.order === resumeOrder;
      if(matchesResume) setEmail(draft.email);
      const sameSelection = draft.selectionKey === selectionKey;
      if(matchesResume && (sameSelection || Boolean(resumeOrder) || !initialService || (draft.serviceSlug===initialService && (!initialOffer || draft.offerId===initialOffer)))) {
        const savedService=services.find(item=>item.slug===draft.serviceSlug);
        if(savedService) {
          const savedOffer=getServiceOffer(savedService,draft.offerId);
          setServiceSlug(savedService.slug); setOfferId(savedOffer.id);
          setQuantity(normalizeCheckoutQuantity(savedService,savedOffer, sameSelection || resumeOrder || !initialQuantity ? draft.quantity : initialQuantity));
          setLink(draft.link); setCommentsText(draft.commentsText);
          if(isPaymentCurrency(draft.paymentMethod) && (sameSelection || resumeOrder || !initialCurrency)) setPaymentMethod(draft.paymentMethod);
          setDraftNotice("Your checkout details have been restored. Review your package and total before paying.");
        }
      }
    }
    setDraftReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    trackCheckout({event:resumeOrder ? "checkout_recovered" : "checkout_opened",order:resumeOrder,serviceSlug:initialService,offerId:initialOffer});
  },[initialService,initialOffer,initialQuantity,initialCurrency,resumeOrder,selectionKey]);

  useEffect(() => {
    if(!draftReady) return;
    try {
      const previous=parseCheckoutDraft(sessionStorage.getItem(checkoutDraftKey));
      persistCheckoutDraft({serviceSlug,offerId:offer.id,quantity,commentsText,link,email,paymentMethod,selectionKey,order:previous?.order});
    } catch { /* Checkout also works when browser storage is unavailable. */ }
  },[draftReady,serviceSlug,offer.id,quantity,commentsText,link,email,paymentMethod,selectionKey]);

  useEffect(() => {
    if (!checkProfileAutomatically || !link.trim() || !parseProfileTarget(service.platform, link)) return;
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
  }, [link, checkProfileAutomatically, service.platform]);

  function changeService(slug: string) {
    if (submitting.current) return;
    const next = services.find((item) => item.slug === slug) || fallback;
    setServiceSlug(slug);
    setOfferId(getServiceOffers(next)[0].id);
    setQuantity(normalizeCheckoutQuantity(next, getServiceOffers(next)[0], next.baseQuantity, requiredMinimum));
    if (next.platform !== service.platform) setLink("");
    setProfileCheck(null);
    setCheckingProfile(false);
    setState("idle");
  }

  function changeOffer(id: string) {
    if (submitting.current) return;
    const next = getServiceOffer(service, id);
    setOfferId(next.id);
    setQuantity((current) => normalizeCheckoutQuantity(service, next, current, requiredMinimum));
    setState("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || checkingPayment || paymentMinimum?.error || belowPaymentMinimum) return;
    if (!profileService && !parseOrderTarget(service, link)) {
      trackCheckout({event:"checkout_validation_failed",serviceSlug,offerId:offer.id});
      setState("error");
      setMessage(`Enter the link to a public ${service.platform} post or video, rather than a profile.`);
      return;
    }
    if (profileService && (!parsedProfile || profileCheck?.status === "not_found" || profileCheck?.status === "private")) {
      setState("error");
      trackCheckout({event:"checkout_validation_failed",serviceSlug,offerId:offer.id});
      setMessage(profileCheck?.status === "private" ? "Make this profile public before ordering." : profileCheck?.status === "not_found" ? "That profile could not be found. Check the username before paying." : "Enter a valid profile username or URL.");
      return;
    }
    if (price < minimumCheckoutUsd || (offer.customComments && comments.length < offerMin)) {
      setState("error");
      setMessage(`Orders must total at least $${minimumCheckoutUsd.toFixed(2)}. Increase the quantity${offer.customComments ? " or add more comments" : ""} to continue.`);
      return;
    }
    trackCheckout({event:"checkout_submit_started",serviceSlug,offerId:offer.id,quantity:offer.customComments ? comments.length : quantity,currency:paymentMethod});
    submitting.current = true;
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(65_000),
        body: JSON.stringify({ serviceSlug, offerId: offer.id, quantity: offer.customComments ? comments.length : quantity, comments, link, email, paymentMethod, resumeOrder, checkoutSession: navigator.doNotTrack === "1" ? undefined : checkoutSessionId(), acceptedTerms: true }),
      });
      const data = await response.json();
      if (typeof data.minimum_usd === "number") setServerMinimum({ currency: paymentMethod, minimum: data.minimum_usd });
      if (!response.ok) throw new Error(data.error || "We could not place the order.");
      setState("success");
      setMessage(`Order ${data.order} was created. Opening secure payment…`);
      try {
        const savedDraft=JSON.stringify({serviceSlug,offerId:offer.id,quantity,commentsText,link,email,paymentMethod,selectionKey,order:data.order,savedAt:Date.now()});
        sessionStorage.setItem(checkoutDraftKey,savedDraft);
        sessionStorage.setItem(`${checkoutDraftKey}:${data.order}`,savedDraft);
      } catch {}
      window.location.assign(data.checkout_url);
    } catch (error) {
      trackCheckout({event:"checkout_client_failed",serviceSlug,offerId:offer.id,currency:paymentMethod});
      submitting.current = false;
      setState("error");
      setMessage(error instanceof Error && error.name === "TimeoutError" ? "Payment setup took too long. Your details are saved; check your connection and try again. If you already sent funds, check order tracking first." : error instanceof Error ? error.message : "We could not place the order.");
    }
  }

  return (
    <form className="checkout" onSubmit={submit} onInvalid={()=>trackCheckout({event:"checkout_validation_failed",serviceSlug,offerId:offer.id})}>
      <div className="checkout__main">
        {draftNotice && <p className="checkout-draft-notice" role="status">{draftNotice}{earlierOrder && <> <Link href={`/track?order=${encodeURIComponent(earlierOrder)}`}>Check your earlier payment before paying again</Link>.</>}</p>}
        {hasSelectedPackage && (
          <div className="selected-package">
            <div className="selected-package__top"><span className="eyebrow">Your selection</span><button type="button" onClick={() => setEditingPackage((current) => !current)} aria-expanded={editingPackage}>{editingPackage ? "Done editing" : "Change package"}</button></div>
            <div className="selected-package__details"><strong>{service.shortTitle}</strong><span>{offer.label} · {offer.customComments ? "Your own comments" : `${quantity.toLocaleString("en-US")} ${service.metric}`}</span></div>
          </div>
        )}
        {hasSelectedPackage && !editingPackage && service.metric === "followers" && offers.length > 1 && (
          <div className="checkout-type-choice">
            <label htmlFor="checkout-follower-type">Follower type</label>
            <select id="checkout-follower-type" value={offer.id} onChange={(event) => changeOffer(event.target.value)}>
              {offers.map((item) => <option value={item.id} key={item.id}>{item.label} · {item.audience}</option>)}
            </select>
            <small>{offer.description} {offer.protection}.</small>
          </div>
        )}
        {editingPackage && <div id="package-editor">
        <div className="form-section">
          <span className="step-number">01</span>
          <div><h2>What do you need?</h2><p>Pick a goal, then choose the platform.</p></div>
        </div>
        <div className="service-options">
          <span className="service-options__label">Goal</span>
          <div className="service-options__grid service-options__grid--goals">
            {(["followers", "likes", "comments", "views"] as const).map((goal) => {
              const metric = goal === "followers" && service.platform === "YouTube" ? "subscribers" : goal;
              const next = services.find((item) => item.platform === service.platform && item.metric === metric);
              return <button className={activeGoal === goal ? "active" : ""} type="button" key={goal} onClick={() => next && changeService(next.slug)} disabled={!next} aria-pressed={activeGoal === goal}>{goal === "followers" && service.platform === "YouTube" ? "Subscribers" : goal[0].toUpperCase() + goal.slice(1)}</button>;
            })}
          </div>
          <span className="service-options__label">Platform</span>
          <div className="service-options__grid service-options__grid--platforms">
            {(["Instagram", "TikTok", "YouTube"] as const).map((platform) => {
              const metric = activeGoal === "followers" && platform === "YouTube" ? "subscribers" : activeGoal;
              const next = services.find((item) => item.platform === platform && item.metric === metric);
              return <button className={service.platform === platform ? "active" : ""} type="button" key={platform} onClick={() => next && changeService(next.slug)} disabled={!next} aria-pressed={service.platform === platform}>{platform}</button>;
            })}
          </div>
        </div>

        <div className="form-section form-section--spaced">
          <span className="step-number">02</span>
          <div><h2>Choose a package</h2><p>Compare the audience, delivery speed and protection.</p></div>
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
          <div><h2>{offer.customComments ? "Write your comments" : "Choose the amount"}</h2><p>{offer.customComments ? `Add at least ${requiredQuantity} comments, one per line, in multiples of ${offerStep}.` : "Use the slider for a package that fits your campaign."}</p></div>
        </div>
        {offer.customComments ? (
          <label className="comments-field">
            <span>Comments <strong>{comments.length.toLocaleString("en-US")}</strong></span>
            <textarea value={commentsText} onChange={(event) => setCommentsText(event.target.value)} rows={8} placeholder={"Love this perspective!\nThis was really helpful.\nGreat work on this one."} required />
          </label>
        ) : (
          <>
            <div className="quantity-presets" aria-label="Popular quantities">
              {quantityPresets.map((preset) => (
                <button key={preset} type="button" aria-pressed={quantity === preset} onClick={() => setQuantity(preset)}>
                  <strong>{preset.toLocaleString("en-US")}</strong><small>${calculateOfferPrice(service, preset, offer).toFixed(2)}</small>
                </button>
              ))}
            </div>
            <label className="range-label" htmlFor="order-quantity"><span>Quantity</span><strong>{quantity.toLocaleString("en-US")}</strong></label>
            <input id="order-quantity" className="range" type="range" min={requiredQuantity} max={offerMax} step={offerStep} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </>
        )}
        {hasSelectedPackage && <button className="package-edit-done" type="button" onClick={() => setEditingPackage(false)}>Continue with this package <ArrowRight aria-hidden="true" /></button>}
        </div>}
        {!editingPackage && offer.customComments && (
          <label className="comments-field comments-field--selected">
            <span>Write your comments <strong>{comments.length.toLocaleString("en-US")}</strong></span>
            <textarea value={commentsText} onChange={(event) => setCommentsText(event.target.value)} rows={6} placeholder={"Love this perspective!\nThis was really helpful.\nGreat work on this one."} required />
            <small>One comment per line. Minimum {requiredQuantity}, in multiples of {offerStep}.</small>
          </label>
        )}

        <div className={`form-section ${editingPackage ? "form-section--spaced" : "form-section--delivery"}`}>
          <span className="step-number">{editingPackage ? "04" : "02"}</span>
          <div><h2>Where should we deliver?</h2><p>{profileService ? `Enter the ${service.platform} username (with or without @), or paste its profile link.` : `Paste the link to the specific public ${service.platform === "Instagram" ? "post or Reel" : "video"}. It needs to stay public during delivery.`}</p></div>
        </div>
        <div className="field-grid">
          <div className="target-field">
            <label><span>{profileService ? `${service.platform} username` : `${service.platform} ${service.platform === "Instagram" ? "post or Reel" : "video"} link`}</span><input type={profileService ? "text" : "url"} value={link} onChange={(event) => { setLink(event.target.value); setProfileCheck(null); setCheckingProfile(false); }} placeholder={profileService ? "@yourusername" : `https://${service.platform === "Instagram" ? "instagram.com/p/..." : service.platform === "TikTok" ? "tiktok.com/@user/video/..." : "youtube.com/watch?v=..."}`} autoComplete="off" required /></label>
            {profileService && link.trim() && (
              <div className={`profile-check profile-check--${checkingProfile ? "checking" : profileCheck?.status || (parsedProfile ? checkProfileAutomatically ? "checking" : "unavailable" : "invalid")}`} role="status">
                {checkingProfile || (checkProfileAutomatically && !profileCheck && parsedProfile) ? "Checking profile…" : profileCheck?.status === "verified" ? `Profile found${profileCheck.displayName ? `: ${profileCheck.displayName}` : ""}` : profileCheck?.status === "private" ? "This profile is private. Make it public before ordering." : profileCheck?.status === "not_found" ? "Profile not found. Check the username." : !parsedProfile ? "Enter a valid username or profile URL." : `Delivery target: @${parsedProfile.handle}`}
                {parsedProfile && profileCheck?.status !== "not_found" && <a href={parsedProfile.url} target="_blank" rel="noopener noreferrer">Preview profile <ExternalLink aria-hidden="true" /></a>}
              </div>
            )}
          </div>
          <label><span>{emailUpdatesEnabled ? "Email for order updates" : "Email for order support"}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
        </div>
      </div>
      <aside className="order-summary">
        <span className="eyebrow">Order summary</span>
        <h2>{service.shortTitle}</h2>
        <div className="summary-row"><span>Package</span><strong>{offer.label}</strong></div>
        <div className="summary-row"><span>Audience</span><strong>{offer.audience}</strong></div>
        <div className="summary-row"><span>Quantity</span><strong>{(offer.customComments ? comments.length : quantity).toLocaleString("en-US")}</strong></div>
        <div className="summary-row"><span>Protection</span><strong>{offer.protection}</strong></div>
        <div className="summary-total"><span>Total</span><strong>{checkingPayment ? "Checking…" : `$${price.toFixed(2)}`}</strong></div>
        {link.trim() && <div className="summary-row"><span>Deliver to</span><strong className="summary-target">{parsedProfile ? `@${parsedProfile.handle}` : link}</strong></div>}
        <p className="checkout-note"><strong>Pay from your crypto wallet or exchange.</strong> Have your funds ready before continuing.</p>
        <fieldset className="payment-methods">
          <legend>How would you like to pay?</legend>
          {paymentMethods.map((method) => (
            <label key={method.id} className={`payment-methods__option ${paymentMethod === method.id ? "payment-methods__option--active" : ""}`}>
              <input disabled={state === "loading"} type="radio" name="payment-method" value={method.id} checked={paymentMethod === method.id} onChange={() => { setPaymentMethod(method.id); setState("idle"); setMessage(""); }} />
              <span><strong>{method.label}</strong><small>{method.network}</small></span>
            </label>
          ))}
        </fieldset>
        <p className="checkout-note">{paymentMethods.find((method) => method.id === paymentMethod)?.note}</p>
        <CryptoPaymentHelp currency={paymentMethod} />
        <div aria-live="polite">
          {checkingPayment && <p className="checkout-note">Checking payment availability…</p>}
          {!checkingPayment && paymentMinimum?.error && (
            <div className="form-message form-message--error" role="alert">
              <p>{paymentMinimum.error}</p>
              <button type="button" className="button button--cream" onClick={() => setMinimumRefresh((value) => value + 1)}>Check again</button>
            </div>
          )}
          {!checkingPayment && !paymentMinimum?.error && belowPaymentMinimum && (
            <div className="form-message form-message--error">
              <p>This payment method currently requires an order of at least ${requiredMinimum.toFixed(2)}.</p>
              {offer.customComments ? <p>Add at least {requiredQuantity.toLocaleString("en-US")} comments or choose another payment method.</p> : Number(calculateOfferPrice(service, requiredQuantity, offer).toFixed(2)) >= requiredMinimum ? (
                <button type="button" className="button button--cream" onClick={() => { setQuantity(requiredQuantity); setState("idle"); setMessage(""); }}>Choose {requiredQuantity.toLocaleString("en-US")} {service.metric} — ${calculateOfferPrice(service, requiredQuantity, offer).toFixed(2)}</button>
              ) : <p>Choose another payment method or package.</p>}
            </div>
          )}
        </div>
        <p className="checkout-note">No account or password needed. We cover provider processing fees; your wallet may charge a network fee to send crypto.</p>
        <label className="checkout-consent">
          <input type="checkbox" required />
          <span>I agree to the <Link href="/terms" target="_blank">terms</Link> and <Link href="/refund-policy" target="_blank">refund policy</Link>.</span>
        </label>
        <button className="button button--coral button--wide" type="submit" disabled={state === "loading" || checkingPayment || Boolean(paymentMinimum?.error) || belowPaymentMinimum}>
          {state === "loading" ? <><LoaderCircle className="spin" /> Preparing payment</> : checkingPayment ? <>Checking payment…</> : <>Continue to payment <ArrowRight /></>}
        </button>
        <p className="checkout-note">Nothing is charged here. You’ll review the address, amount and timer on NOWPayments before sending.</p>
        <p className="secure-note"><LockKeyhole aria-hidden="true" /> Encrypted and private. No password required.</p>
        {message && <div className={`form-message form-message--${state}`} role="status">{state === "success" && <CheckCircle2 />} {message}</div>}
        {!emailUpdatesEnabled && <p className="checkout-note">Keep your order number for updates in order tracking.</p>}
        <p className="checkout-note">Already sent funds? Check your order status before starting another payment.</p>
        <p className="checkout-note">Payment confirmation comes first. Delivery starts afterwards; you can follow both in order tracking.</p>
      </aside>
    </form>
  );
}
