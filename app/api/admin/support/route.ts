import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { listSupportRequests, resolveSupportRequest } from "@/lib/support-store";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.SMM_FULFILLMENT_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const requests = await listSupportRequests();
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Support requests could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const input = await request.json() as { id?: string };
    if (!input.id || input.id.length > 80) return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
    const updated = await resolveSupportRequest(input.id);
    if (!updated) return NextResponse.json({ error: "Open request not found." }, { status: 404 });
    return NextResponse.json({ request: updated.id, status: updated.status });
  } catch {
    return NextResponse.json({ error: "Support request could not be updated." }, { status: 503 });
  }
}
