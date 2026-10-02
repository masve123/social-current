import postgres from "postgres";

type DatabaseClient = ReturnType<typeof postgres>;

const globalDatabase = globalThis as typeof globalThis & {
  socialCurrentDb?: DatabaseClient;
  socialCurrentSchema?: Promise<void>;
};

export function database() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  if (!globalDatabase.socialCurrentDb) {
    globalDatabase.socialCurrentDb = postgres(connectionString, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
    });
  }

  return globalDatabase.socialCurrentDb;
}

export async function ensureDatabase() {
  if (!globalDatabase.socialCurrentSchema) {
    globalDatabase.socialCurrentSchema = (async () => {
      const sql = database();
      await sql`
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
          submitted_at TIMESTAMPTZ
        )
      `;
      await sql`
        ALTER TABLE social_current_orders
        ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS social_current_orders_payment_status_idx
        ON social_current_orders (payment_status, fulfillment_status, created_at)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS social_current_payment_events (
          event_id TEXT PRIMARY KEY,
          public_id TEXT NOT NULL REFERENCES social_current_orders(public_id),
          payment_status TEXT,
          payload JSONB NOT NULL,
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS social_current_checkout_attempts (
          ip_hash TEXT NOT NULL,
          window_start TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (ip_hash, window_start)
        )
      `;
    })().catch((error) => {
      globalDatabase.socialCurrentSchema = undefined;
      throw error;
    });
  }

  await globalDatabase.socialCurrentSchema;
}
