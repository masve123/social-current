import { createHash, randomBytes } from "node:crypto";
import { database, ensureDatabase } from "@/lib/db";

export type SupportRequest = {
  id: string;
  name: string;
  email: string;
  order_number: string | null;
  message: string;
  status: "open" | "resolved";
  created_at: Date;
  updated_at: Date;
};

export async function allowSupportAttempt(ipAddress: string) {
  await ensureDatabase();
  const sql = database();
  const secret = process.env.SMM_FULFILLMENT_SECRET || "social-current-support";
  const ipHash = createHash("sha256").update(`${secret}:${ipAddress}`).digest("hex");
  const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
  const [result] = await sql<{ attempts: number }[]>`
    INSERT INTO social_current_support_attempts (ip_hash, window_start, attempts)
    VALUES (${ipHash}, ${windowStart}, 1)
    ON CONFLICT (ip_hash, window_start)
    DO UPDATE SET attempts = social_current_support_attempts.attempts + 1
    RETURNING attempts
  `;
  return result.attempts <= 5;
}

export async function createSupportRequest(input: {
  name: string;
  email: string;
  orderNumber?: string;
  message: string;
}) {
  await ensureDatabase();
  const sql = database();
  const id = `SC-SUP-${randomBytes(6).toString("hex").toUpperCase()}`;
  const [request] = await sql<SupportRequest[]>`
    INSERT INTO social_current_support_requests (id, name, email, order_number, message)
    VALUES (${id}, ${input.name}, ${input.email}, ${input.orderNumber || null}, ${input.message})
    RETURNING *
  `;
  return request;
}

export async function listSupportRequests(limit = 50) {
  await ensureDatabase();
  const sql = database();
  return sql<SupportRequest[]>`
    SELECT * FROM social_current_support_requests
    ORDER BY (status = 'open') DESC, created_at DESC
    LIMIT ${Math.max(1, Math.min(limit, 100))}
  `;
}

export async function resolveSupportRequest(id: string) {
  await ensureDatabase();
  const sql = database();
  const [request] = await sql<SupportRequest[]>`
    UPDATE social_current_support_requests
    SET status = 'resolved', updated_at = NOW()
    WHERE id = ${id} AND status = 'open'
    RETURNING *
  `;
  return request;
}
