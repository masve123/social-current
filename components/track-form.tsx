"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { checkoutDraftKey, parseCheckoutDraft } from "@/lib/checkout-draft";
import { RefreshCcw, Search, XCircle } from "lucide-react";

type TrackResult = Record<string, string | boolean>;

export function TrackForm({ initialOrder = "" }: { initialOrder?: string }) {
  const [order, setOrder] = useState(initialOrder);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let lookup=initialOrder;
    if(!lookup) {
      try {lookup=parseCheckoutDraft(sessionStorage.getItem(checkoutDraftKey))?.order || "";} catch {}
      if(!/^SC-\d{6}-[A-F0-9]{16}$/.test(lookup)) return;
      // Restore the current tab's order reference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder(lookup);
    }
    const controller = new AbortController();
    fetch(`/api/order?order=${encodeURIComponent(lookup)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to find that order.");
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load this order."); });
    return () => controller.abort();
  }, [initialOrder]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/order?order=${encodeURIComponent(order)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to find that order.");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this order. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  async function requestAction(action: "refill" | "cancel") {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/order/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: result?.order || order, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The request could not be completed.");
      setResult((current) => ({ ...(current || {}), action_status: data.status }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request could not be completed. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="track-card">
      <form onSubmit={submit}>
        <label htmlFor="order-number">Order number</label>
        <div className="input-button">
          <input id="order-number" value={order} onChange={(event) => setOrder(event.target.value)} placeholder="SC-261021-…" required />
          <button className="button button--ink" type="submit" disabled={working}><Search /> Check status</button>
        </div>
      </form>
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {result && (
        <>
          <dl className="track-result">
            {Object.entries(result).filter(([key]) => !key.startsWith("can_") && !["order","retry_url","payment_url"].includes(key)).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{String(value)}</dd></div>)}
          </dl>
          {result.retry_url && <><p>If you already sent funds, contact support before paying again.</p><Link className="button button--coral" href={String(result.retry_url)}>Review details and try again</Link></>}
          {result.payment_url && <a className="button button--coral" href={String(result.payment_url)}>Return to payment</a>}
          {(result.can_refill || result.can_cancel) && (
            <div className="track-actions">
              {result.can_refill && <button className="button button--ink" type="button" disabled={working} onClick={() => requestAction("refill")}><RefreshCcw /> Request refill</button>}
              {result.can_cancel && <button className="button button--cream" type="button" disabled={working} onClick={() => requestAction("cancel")}><XCircle /> Request cancellation</button>}
            </div>
          )}
          <Link className="track-card__support" href={`/contact?order=${encodeURIComponent(String(result.order || order))}`}>Ask for help with this order</Link>
        </>
      )}
    </div>
  );
}
