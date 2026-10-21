import { NextRequest, NextResponse } from "next/server";
import { parseDiscoveryAnswer } from "@/lib/discovery-survey";
import { discoverySurveyAvailable, saveDiscoveryAnswer } from "@/lib/discovery-survey-store";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const order = request.nextUrl.searchParams.get("order") || "";
  if (!/^SC-\d{6}-[A-F0-9]{16}$/.test(order)) return NextResponse.json({ available: false }, { status: 400 });
  try {
    return NextResponse.json({ available: await discoverySurveyAvailable(order) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  // Next.js can normalize nextUrl to localhost behind a proxy; compare the
  // browser's origin against the actual request host instead.
  let sameOrigin = false;
  try {
    const origin = new URL(request.headers.get("origin") || "");
    sameOrigin = ["https:", "http:"].includes(origin.protocol)
      && origin.host === (request.headers.get("host") || request.nextUrl.host);
  } catch { /* Missing or malformed origins are rejected. */ }
  if (!sameOrigin) return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get("content-length")) > 2048) return new NextResponse(null, { status: 413 });
  try {
    const raw = await request.text();
    if (raw.length > 2048) return new NextResponse(null, { status: 413 });
    let data: unknown;
    try { data = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
    const answer = parseDiscoveryAnswer(data);
    if (!answer) return new NextResponse(null, { status: 400 });
    const paid = await saveDiscoveryAnswer(answer);
    return new NextResponse(null, { status: paid ? 204 : 409 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
