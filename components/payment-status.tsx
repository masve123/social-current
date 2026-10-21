"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { trackCheckout } from "@/lib/checkout-telemetry";

type StatusResult = {
  order: string;
  retry_url?:string;
  payment_url?:string;
  service?: string;
  package?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
};

export function PaymentStatus({ order, recordReturn = false }: { order: string; recordReturn?:boolean }) {
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if(recordReturn) trackCheckout({event:"payment_returned",order});
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      try {
        const response = await fetch(`/api/order?order=${encodeURIComponent(order)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "We could not load this order.");
        if (!cancelled) { setResult(data); setError(""); }
        const complete = ["submitted", "completed", "partial", "manual_review"].includes(data.fulfillment_status)
          || ["invoice_failed", "failed", "expired", "refunded"].includes(data.payment_status);
        if (!cancelled && !complete && attempts++ < 30) timer = setTimeout(refresh, 3000);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "We could not load this order.");
          if (attempts++ < 30) timer = setTimeout(refresh, 3000);
        }
      }
    }
    refresh();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [order,recordReturn]);

  const paid = result && ["confirmed", "sending", "finished"].includes(result.payment_status || "");
  const heading = result?.payment_status === "refunded" ? "Payment refunded"
    : ["invoice_failed", "failed", "expired"].includes(result?.payment_status || "") ? "Payment was not completed"
    : result?.payment_status === "partially_paid" ? "Payment is incomplete"
    : result?.payment_status === "amount_mismatch" || result?.fulfillment_status === "manual_review" ? "Your order is being reviewed"
    : paid ? "Payment confirmed" : "Waiting for payment";
  return (
    <div className="payment-result">
      {!result && !error && <LoaderCircle className="spin" aria-label="Checking payment" />}
      {error && <p className="form-message form-message--error">{error}</p>}
      {result && (
        <>
          {paid ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
          <h2>{heading}</h2>
          {result.status && result.status !== heading && <p>{result.status}</p>}
          <dl className="track-result">
            <div><dt>Order</dt><dd>{result.order}</dd></div>
            <div><dt>Service</dt><dd>{result.service}</dd></div>
            <div><dt>Package</dt><dd>{result.package}</dd></div>
          </dl>
          {result.retry_url && <><p>If you haven’t sent funds, you can review your saved details and start a fresh payment. If you already sent funds, contact us before paying again.</p><Link className="button button--coral" href={result.retry_url}>Review details and try again</Link></>}
          {result.payment_url && <><p>If you haven’t sent payment, you can return to the existing payment page. Check its timer before sending.</p><a className="button button--coral" href={result.payment_url}>Return to payment</a></>}
          {paid && <p>Your payment is confirmed. Delivery progress is shown separately in order tracking.</p>}
          <Link className="button button--ink" href={`/track?order=${encodeURIComponent(order)}`}>Track this order</Link>
          <Link className="payment-result__support" href={`/contact?order=${encodeURIComponent(order)}`}>Need help with this order?</Link>
        </>
      )}
    </div>
  );
}
