"use client";
import { uuidPattern, type CheckoutEvent } from "@/lib/checkout-events";
let ephemeralSession: string | undefined;
export function checkoutSessionId() {
  if (!ephemeralSession) {
    try {ephemeralSession = sessionStorage.getItem("sc-checkout-session") || undefined;} catch {}
    if (!ephemeralSession || !uuidPattern.test(ephemeralSession)) ephemeralSession = crypto.randomUUID();
    try {sessionStorage.setItem("sc-checkout-session",ephemeralSession);} catch {}
  }
  return ephemeralSession;
}
export function trackCheckout(event: Omit<CheckoutEvent,"eventId"|"sessionId">) {
  if (navigator.doNotTrack === "1") return;
  try {
    void fetch("/api/checkout/events", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...event,eventId:crypto.randomUUID(),sessionId:checkoutSessionId()}),keepalive:true}).catch(()=>undefined);
  } catch { /* Measurement must never interrupt checkout. */ }
}
