"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type StatusResult = {
  order: string;
  service?: string;
  package?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
};

export function PaymentStatus({ order }: { order: string }) {
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function refresh() {
      try {
        const response = await fetch(`/api/order?order=${encodeURIComponent(order)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "We could not load this order.");
        if (!cancelled) setResult(data);
        const complete = ["submitted", "completed", "partial", "manual_review"].includes(data.fulfillment_status);
        if (!cancelled && !complete && attempts++ < 30) window.setTimeout(refresh, 3000);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "We could not load this order.");
      }
    }
    refresh();
    return () => { cancelled = true; };
  }, [order]);

  const paid = result && ["confirmed", "sending", "finished"].includes(result.payment_status || "");
  const heading = result?.payment_status === "refunded" ? "Payment refunded" : paid ? "Payment confirmed" : "Confirming your payment";
  return (
    <div className="payment-result">
      {!result && !error && <LoaderCircle className="spin" aria-label="Checking payment" />}
      {error && <p className="form-message form-message--error">{error}</p>}
      {result && (
        <>
          {paid ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
          <h2>{heading}</h2>
          <p>{result.status}</p>
          <dl className="track-result">
            <div><dt>Order</dt><dd>{result.order}</dd></div>
            <div><dt>Service</dt><dd>{result.service}</dd></div>
            <div><dt>Package</dt><dd>{result.package}</dd></div>
          </dl>
          <Link className="button button--ink" href={`/track?order=${encodeURIComponent(order)}`}>Track this order</Link>
          <Link className="payment-result__support" href={`/contact?order=${encodeURIComponent(order)}`}>Need help with this order?</Link>
        </>
      )}
    </div>
  );
}
