CREATE TABLE IF NOT EXISTS social_current_orders (
  id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  service_slug TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  target_url TEXT NOT NULL,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  amount_usd NUMERIC(12, 2) NOT NULL,
  payment_provider TEXT NOT NULL DEFAULT 'nowpayments',
  payment_invoice_id TEXT UNIQUE,
  payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'creating',
  payment_payload JSONB,
  checkout_url TEXT,
  fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_payment',
  provider TEXT,
  provider_order_id TEXT,
  provider_status TEXT,
  wholesale_cost NUMERIC(14, 6),
  failure_reason TEXT,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  supplier_request_started_at TIMESTAMPTZ,
  fulfillment_version SMALLINT NOT NULL DEFAULT 1
);

ALTER TABLE social_current_orders ADD COLUMN IF NOT EXISTS supplier_request_started_at TIMESTAMPTZ;
ALTER TABLE social_current_orders ADD COLUMN IF NOT EXISTS fulfillment_version SMALLINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS social_current_orders_payment_status_idx
ON social_current_orders (payment_status, fulfillment_status, created_at);

CREATE TABLE IF NOT EXISTS social_current_payment_events (
  event_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL REFERENCES social_current_orders(public_id),
  payment_status TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_current_checkout_attempts (
  ip_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, window_start)
);

CREATE TABLE IF NOT EXISTS social_current_support_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  order_number TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_current_support_requests_status_created_idx
ON social_current_support_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS social_current_support_attempts (
  ip_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, window_start)
);
