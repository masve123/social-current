import { randomUUID } from "node:crypto";
import { database } from "@/lib/db";
import { uuidPattern, type CheckoutEvent } from "@/lib/checkout-events";
import { getService } from "@/lib/services";
import { getServiceOffers } from "@/lib/smm-offers";
import { isPaymentCurrency } from "@/lib/payment-methods";
let ready: Promise<void> | undefined;
async function ensureEvents() {
  ready ??= (async()=>{
    await database()`CREATE TABLE IF NOT EXISTS social_current_checkout_events (
      event_id TEXT PRIMARY KEY, event_name TEXT NOT NULL, session_id TEXT,
      public_id TEXT, service_slug TEXT, offer_id TEXT, currency TEXT,
      quantity INTEGER, error_code TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await database()`CREATE INDEX IF NOT EXISTS social_current_checkout_events_created_idx ON social_current_checkout_events(created_at)`;
    await database()`CREATE INDEX IF NOT EXISTS social_current_checkout_events_session_idx ON social_current_checkout_events(session_id,created_at)`;
  })().catch(error=>{ready=undefined;throw error;});
  await ready;
}
export async function saveCheckoutEvent(input: Omit<CheckoutEvent,"eventId"> & {eventId?:string}) {
  try {
    await ensureEvents();
    const service = getService(input.serviceSlug || "");
    const offer = service && getServiceOffers(service).find(item=>item.id===input.offerId);
    const session = input.sessionId && uuidPattern.test(input.sessionId) ? input.sessionId : null;
    const order = /^SC-\d{6}-[A-F0-9]{16}$/.test(input.order || "") ? input.order! : null;
    const errorCode = ["invalid_details","minimum","provider_unavailable","rate_limit"].includes(input.errorCode || "") ? input.errorCode! : null;
    // No free text, URLs, addresses or IP data enters this table.
    await database()`WITH cleanup AS (DELETE FROM social_current_checkout_events WHERE created_at<NOW()-INTERVAL '90 days')
      INSERT INTO social_current_checkout_events(event_id,event_name,session_id,public_id,service_slug,offer_id,currency,quantity,error_code)
      SELECT ${input.eventId || randomUUID()},${input.event},${session},${order},${service?.slug || null},${offer?.id || null},${isPaymentCurrency(input.currency) ? input.currency : null},${Number.isInteger(input.quantity) && input.quantity! > 0 && input.quantity! <= 10000000 ? input.quantity! : null},${errorCode}
      WHERE ${session}::text IS NULL OR (SELECT COUNT(*) FROM social_current_checkout_events WHERE session_id=${session} AND created_at>NOW()-INTERVAL '1 hour') < 120
      ON CONFLICT(event_id) DO NOTHING`;
  } catch { /* Payment processing must continue if measurement is unavailable. */ }
}
export async function checkoutFunnel() {
  await ensureEvents();
  const stages = await database()`SELECT event_name, COUNT(*)::int events, COUNT(DISTINCT session_id)::int sessions, COUNT(DISTINCT public_id)::int orders FROM social_current_checkout_events WHERE created_at>NOW()-INTERVAL '30 days' GROUP BY event_name ORDER BY event_name`;
  const failures = await database()`SELECT error_code,COUNT(*)::int events FROM social_current_checkout_events WHERE event_name='checkout_failed' AND created_at>NOW()-INTERVAL '30 days' GROUP BY error_code`;
  const sequence = ["package_selected","checkout_opened","checkout_validation_failed","checkout_submit_started","checkout_submitted","checkout_failed","checkout_client_failed","payment_setup_succeeded","payment_returned","checkout_recovered","payment_confirmed","payment_expired"];
  stages.sort((a,b)=>sequence.indexOf(a.event_name)-sequence.indexOf(b.event_name));
  return {stages,failures};
}

export async function pruneCheckoutEvents() {
  await ensureEvents();
  await database()`DELETE FROM social_current_checkout_events WHERE created_at<NOW()-INTERVAL '90 days'`;
}
