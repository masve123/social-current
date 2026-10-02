"use client";

import { FormEvent, useState } from "react";
import { RefreshCcw, Search, XCircle } from "lucide-react";

type TrackResult = Record<string, string | boolean>;

export function TrackForm() {
  const [order, setOrder] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    const response = await fetch(`/api/order?order=${encodeURIComponent(order)}`);
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to find that order.");
    else setResult(data);
  }

  async function requestAction(action: "refill" | "cancel") {
    setWorking(true);
    setError("");
    const response = await fetch("/api/order/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, action }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "The request could not be completed.");
    else setResult((current) => ({ ...(current || {}), action_status: data.status }));
    setWorking(false);
  }

  return (
    <div className="track-card">
      <form onSubmit={submit}>
        <label htmlFor="order-number">Order number</label>
        <div className="input-button">
          <input id="order-number" value={order} onChange={(event) => setOrder(event.target.value)} placeholder="SC1…" required />
          <button className="button button--ink" type="submit"><Search /> Check status</button>
        </div>
      </form>
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {result && (
        <>
          <dl className="track-result">
            {Object.entries(result).filter(([key]) => !key.startsWith("can_") && key !== "order").map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{String(value)}</dd></div>)}
          </dl>
          {(result.can_refill || result.can_cancel) && (
            <div className="track-actions">
              {result.can_refill && <button className="button button--ink" type="button" disabled={working} onClick={() => requestAction("refill")}><RefreshCcw /> Request refill</button>}
              {result.can_cancel && <button className="button button--cream" type="button" disabled={working} onClick={() => requestAction("cancel")}><XCircle /> Request cancellation</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
