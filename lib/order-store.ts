import { createHash, randomBytes, randomUUID } from "node:crypto";

import { database, ensureDatabase } from "@/lib/db";
import type { JsonValue } from "@/lib/nowpayments";
import type { ProviderId } from "@/lib/smm";

export type StoredOrder = {
  id: string;
  public_id: string;
  email: string;
  service_slug: string;
  offer_id: string;
  quantity: number;
  target_url: string;
  comments: string[];
  amount_usd: string;
  payment_provider: string;
  payment_invoice_id: string | null;
  payment_id: string | null;
  payment_status: string;
  payment_payload: Record<string, unknown> | null;
  checkout_url: string | null;
  fulfillment_status: string;
  provider: ProviderId | null;
  provider_order_id: string | null;
  provider_status: string | null;
  wholesale_cost: string | null;
  failure_reason: string | null;
  terms_accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  paid_at: Date | null;
  submitted_at: Date | null;
};

export function createPublicOrderId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `SC-${date}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function createStoredOrder(input: {
  publicId: string;
  email: string;
  serviceSlug: string;
  offerId: string;
  quantity: number;
  targetUrl: string;
  comments: string[];
  amountUsd: number;
}) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    INSERT INTO social_current_orders (
      id, public_id, email, service_slug, offer_id, quantity,
      target_url, comments, amount_usd, terms_accepted_at
    ) VALUES (
      ${randomUUID()}, ${input.publicId}, ${input.email}, ${input.serviceSlug},
      ${input.offerId}, ${input.quantity}, ${input.targetUrl},
      ${sql.json(input.comments)}, ${input.amountUsd}, NOW()
    )
    RETURNING *
  `;
  return order;
}

export async function allowCheckoutAttempt(ipAddress: string) {
  await ensureDatabase();
  const sql = database();
  const secret = process.env.SMM_FULFILLMENT_SECRET || "social-current-checkout";
  const ipHash = createHash("sha256").update(`${secret}:${ipAddress}`).digest("hex");
  const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
  const [result] = await sql<{ attempts: number }[]>`
    INSERT INTO social_current_checkout_attempts (ip_hash, window_start, attempts)
    VALUES (${ipHash}, ${windowStart}, 1)
    ON CONFLICT (ip_hash, window_start)
    DO UPDATE SET attempts = social_current_checkout_attempts.attempts + 1
    RETURNING attempts
  `;
  return result.attempts <= 12;
}

export async function attachPaymentInvoice(publicId: string, input: {
  invoiceId: string;
  checkoutUrl: string;
}) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET payment_invoice_id = ${input.invoiceId}, checkout_url = ${input.checkoutUrl},
        payment_status = 'waiting', updated_at = NOW(), failure_reason = NULL
    WHERE public_id = ${publicId}
    RETURNING *
  `;
  return order;
}

export async function markInvoiceCreationFailed(publicId: string, reason: string) {
  await ensureDatabase();
  const sql = database();
  await sql`
    UPDATE social_current_orders
    SET payment_status = 'invoice_failed', failure_reason = ${reason}, updated_at = NOW()
    WHERE public_id = ${publicId}
  `;
}

export async function findStoredOrder(publicId: string) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    SELECT * FROM social_current_orders WHERE public_id = ${publicId} LIMIT 1
  `;
  return order;
}

export async function recordPaymentEvent(input: {
  rawBody: string;
  publicId: string;
  paymentStatus: string;
  paymentId?: string;
  payload: Record<string, JsonValue | undefined>;
  amountMatches: boolean;
}) {
  await ensureDatabase();
  const sql = database();
  const eventId = createHash("sha256").update(input.rawBody).digest("hex");
  await sql`
    INSERT INTO social_current_payment_events (event_id, public_id, payment_status, payload)
    VALUES (${eventId}, ${input.publicId}, ${input.paymentStatus}, ${sql.json(input.payload)})
    ON CONFLICT (event_id) DO NOTHING
  `;

  const status = input.amountMatches ? input.paymentStatus : "amount_mismatch";
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET payment_id = COALESCE(${input.paymentId || null}, payment_id),
        payment_status = ${status}, payment_payload = ${sql.json(input.payload)},
        fulfillment_status = CASE
          WHEN ${input.amountMatches} = FALSE THEN 'manual_review'
          ELSE fulfillment_status
        END,
        failure_reason = CASE
          WHEN ${input.amountMatches} = FALSE THEN 'The payment amount or currency did not match the order.'
          ELSE failure_reason
        END,
        paid_at = CASE
          WHEN ${input.paymentStatus} IN ('confirmed', 'sending', 'finished') AND ${input.amountMatches} = TRUE
          THEN COALESCE(paid_at, NOW())
          ELSE paid_at
        END,
        updated_at = NOW()
    WHERE public_id = ${input.publicId}
    RETURNING *
  `;
  return order;
}

export async function claimOrderForFulfillment(publicId: string) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET fulfillment_status = 'submitting', failure_reason = NULL, updated_at = NOW()
    WHERE public_id = ${publicId}
      AND payment_status IN ('confirmed', 'sending', 'finished')
      AND fulfillment_status IN ('awaiting_payment', 'queued_supplier_funds', 'retry')
    RETURNING *
  `;
  return order;
}

export async function markOrderQueued(publicId: string, reason: string, wholesaleCost?: number) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET fulfillment_status = 'queued_supplier_funds', failure_reason = ${reason},
        wholesale_cost = COALESCE(${wholesaleCost ?? null}, wholesale_cost), updated_at = NOW()
    WHERE public_id = ${publicId}
    RETURNING *
  `;
  return order;
}

export async function markOrderManualReview(publicId: string, reason: string) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET fulfillment_status = 'manual_review', failure_reason = ${reason}, updated_at = NOW()
    WHERE public_id = ${publicId}
    RETURNING *
  `;
  return order;
}

export async function markOrderSubmitted(publicId: string, input: {
  provider: ProviderId;
  providerOrderId: string;
  providerStatus: string;
  wholesaleCost?: number;
}) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET fulfillment_status = 'submitted', provider = ${input.provider},
        provider_order_id = ${input.providerOrderId}, provider_status = ${input.providerStatus},
        wholesale_cost = COALESCE(${input.wholesaleCost ?? null}, wholesale_cost),
        failure_reason = NULL, submitted_at = NOW(), updated_at = NOW()
    WHERE public_id = ${publicId}
    RETURNING *
  `;
  return order;
}

export async function updateProviderStatus(publicId: string, providerStatus: string) {
  await ensureDatabase();
  const sql = database();
  const normalized = providerStatus.toLowerCase();
  const fulfillmentStatus = normalized === "completed"
    ? "completed"
    : normalized === "partial"
      ? "partial"
      : normalized === "canceled"
        ? "canceled"
        : "submitted";
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET provider_status = ${providerStatus}, fulfillment_status = ${fulfillmentStatus}, updated_at = NOW()
    WHERE public_id = ${publicId}
    RETURNING *
  `;
  return order;
}

export async function listActionableOrders(limit = 50) {
  await ensureDatabase();
  const sql = database();
  return sql<StoredOrder[]>`
    SELECT * FROM social_current_orders
    WHERE fulfillment_status IN ('queued_supplier_funds', 'manual_review', 'submitting')
       OR payment_status IN ('partially_paid', 'amount_mismatch', 'refunded')
    ORDER BY created_at DESC
    LIMIT ${Math.min(100, Math.max(1, limit))}
  `;
}

export async function makeOrderRetryable(publicId: string, reviewedProvider = false) {
  await ensureDatabase();
  const sql = database();
  const [order] = await sql<StoredOrder[]>`
    UPDATE social_current_orders
    SET fulfillment_status = 'retry', failure_reason = NULL, updated_at = NOW()
    WHERE public_id = ${publicId}
      AND provider_order_id IS NULL
      AND payment_status IN ('confirmed', 'sending', 'finished')
      AND (
        fulfillment_status = 'queued_supplier_funds'
        OR (${reviewedProvider} = TRUE AND fulfillment_status = 'manual_review')
      )
    RETURNING *
  `;
  return order;
}
