import { NextRequest, NextResponse } from "next/server";
import { allowSupportAttempt, createSupportRequest } from "@/lib/support-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 12_000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 413 });
    }
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!await allowSupportAttempt(ipAddress)) {
      return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
    }
    let input: unknown;
    try { input = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid message." }, { status: 400 }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "Enter a valid message." }, { status: 400 });
    }
    const fields = input as Record<string, unknown>;
    const name = typeof fields.name === "string" ? fields.name.trim() : "";
    const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
    const orderNumber = typeof fields.orderNumber === "string" ? fields.orderNumber.trim().toUpperCase() : "";
    const message = typeof fields.message === "string" ? fields.message.trim() : "";
    if (!name || name.length > 100 || !email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)
      || orderNumber.length > 80 || message.length < 10 || message.length > 5000) {
      return NextResponse.json({ error: "Enter your name, a valid email, and a message of 10–5,000 characters." }, { status: 400 });
    }
    const saved = await createSupportRequest({ name, email, orderNumber, message });
    return NextResponse.json({ request: saved.id, received: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Your message could not be saved. Please try again." }, { status: 503 });
  }
}
