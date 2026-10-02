import { NextRequest, NextResponse } from "next/server";
import { verifyProfile } from "@/lib/profile-verification";
import type { Service } from "@/lib/services";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let input: { platform?: Service["platform"]; target?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Enter a username." }, { status: 400 }); }
  if (!input || !["Instagram", "TikTok", "YouTube"].includes(input.platform || "")) {
    return NextResponse.json({ error: "Choose a supported platform." }, { status: 400 });
  }
  const result = await verifyProfile(input.platform!, typeof input.target === "string" ? input.target : "");
  return NextResponse.json(result, { status: result.status === "invalid" ? 400 : 200 });
}
