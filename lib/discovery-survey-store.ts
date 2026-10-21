import { database } from "@/lib/db";
import type { parseDiscoveryAnswer } from "@/lib/discovery-survey";

let ready: Promise<void> | undefined;
async function ensureSurvey() {
  ready ??= database()`CREATE TABLE IF NOT EXISTS social_current_discovery_answers (
    public_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    other_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`.then(() => undefined).catch(error => { ready = undefined; throw error; });
  await ready;
}

export async function discoverySurveyAvailable(order: string) {
  await ensureSurvey();
  const [result] = await database()`SELECT public_id FROM social_current_orders
    WHERE public_id = ${order} AND payment_status IN ('confirmed', 'sending', 'finished')
    AND NOT EXISTS (SELECT 1 FROM social_current_discovery_answers WHERE public_id = ${order})`;
  return Boolean(result);
}

export async function saveDiscoveryAnswer(answer: NonNullable<ReturnType<typeof parseDiscoveryAnswer>>) {
  await ensureSurvey();
  // This isolated write never changes an order, payment, or fulfillment state.
  const [paid] = await database()`SELECT public_id FROM social_current_orders
    WHERE public_id = ${answer.order} AND payment_status IN ('confirmed', 'sending', 'finished')`;
  if (!paid) return false;
  await database()`INSERT INTO social_current_discovery_answers (public_id, source, other_text)
    SELECT public_id, ${answer.source}, ${answer.other} FROM social_current_orders
    WHERE public_id = ${answer.order} AND payment_status IN ('confirmed', 'sending', 'finished')
    ON CONFLICT (public_id) DO NOTHING`;
  return true;
}

export async function discoveryReport() {
  await ensureSurvey();
  const counts = await database()`SELECT source, COUNT(*)::int AS answers FROM social_current_discovery_answers GROUP BY source ORDER BY answers DESC`;
  const other = await database()`SELECT other_text, created_at FROM social_current_discovery_answers WHERE source = 'other' ORDER BY created_at DESC LIMIT 50`;
  return { counts, other };
}
