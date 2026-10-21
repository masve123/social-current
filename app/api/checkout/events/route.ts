import { NextRequest, NextResponse } from "next/server";
import { browserCheckoutEvents, uuidPattern } from "@/lib/checkout-events";
import { saveCheckoutEvent } from "@/lib/checkout-event-store";
import type { CheckoutEvent } from "@/lib/checkout-events";
export const runtime="nodejs";
export async function POST(request:NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({error:"Invalid origin."},{status:403});
  if (Number(request.headers.get("content-length")) > 2048) return new NextResponse(null,{status:413});
  const raw=await request.text();
  if(raw.length>2048) return new NextResponse(null,{status:413});
  let data;
  try {data=JSON.parse(raw);} catch {return new NextResponse(null,{status:400});}
  const allowed=["event","eventId","sessionId","order","serviceSlug","offerId","currency","quantity"];
  if(!data || typeof data!=="object" || Array.isArray(data) || Object.keys(data).some(key=>!allowed.includes(key))
    || !browserCheckoutEvents.includes(data.event) || !uuidPattern.test(data.eventId || "") || !uuidPattern.test(data.sessionId || "")
    || [data.order,data.serviceSlug,data.offerId,data.currency].some(value=>value!==undefined && typeof value!=="string")
    || (data.quantity!==undefined && (!Number.isInteger(data.quantity) || data.quantity<=0 || data.quantity>10000000))) return new NextResponse(null,{status:400});
  await saveCheckoutEvent(data as CheckoutEvent);
  return new NextResponse(null,{status:204});
}
