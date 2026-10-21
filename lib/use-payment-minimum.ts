"use client";

import { useEffect, useState } from "react";
import type { PaymentCurrency } from "@/lib/payment-methods";

type Minimum = { currency: PaymentCurrency; minimum?: number; error?: string };
const requests = new Map<PaymentCurrency, { expires: number; promise: Promise<Minimum> }>();
export function usePaymentMinimum(currency: PaymentCurrency, refresh = 0) {
  const [result, setResult] = useState<Minimum | null>(null);
  useEffect(() => {
    let active = true;
    let cached = requests.get(currency);
    if (!cached || cached.expires < Date.now() || refresh > 0) {
      const promise = fetch(`/api/payments/minimum?currency=${currency}`, {cache:"no-store",signal:AbortSignal.timeout(15_000)})
        .then(async response => {
          const data = await response.json();
          if (!response.ok || !Number.isFinite(data.minimum_usd) || data.minimum_usd <= 0) throw new Error(data.error || "Payment availability could not be checked.");
          return {currency, minimum:data.minimum_usd} as Minimum;
        }).catch(error => ({currency,error:error instanceof Error && error.name !== "TimeoutError" ? error.message : "Payment availability could not be checked. Check your connection and try again."}));
      cached = {expires:Date.now()+30_000,promise};
      requests.set(currency,cached);
    }
    cached.promise.then(value => {if(active) setResult(value);});
    return () => {active=false;};
  }, [currency,refresh]);
  return result?.currency === currency ? result : null;
}
