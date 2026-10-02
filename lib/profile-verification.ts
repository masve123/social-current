import { parseProfileTarget } from "@/lib/profile-target";
import type { Service } from "@/lib/services";

type Platform = Service["platform"];

function metaContent(html: string, property: string) {
  const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*>`, "i"));
  return match?.[0].match(/content=["']([^"']*)["']/i)?.[1];
}

export async function verifyProfile(platform: Platform, input: string) {
  const target = parseProfileTarget(platform, input);
  if (!target) return { status: "invalid" as const };

  try {
    const response = await fetch(target.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SocialCurrentProfileCheck/1.0)" },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(6500),
    });
    if (response.status === 404) return { status: "not_found" as const, ...target };
    if (!response.ok) return { status: "unavailable" as const, ...target, upstreamStatus: response.status };
    const html = await response.text();
    const title = metaContent(html, "og:title");

    if (platform === "Instagram") {
      const verified = Boolean(title && title.toLowerCase().includes(`(@${target.handle.toLowerCase()})`));
      return { status: verified ? "verified" as const : "unavailable" as const, ...target, displayName: verified ? title?.split(" (@")[0] : undefined, upstreamStatus: response.status };
    }
    if (platform === "TikTok") {
      const detail = html.match(/"webapp\.user-detail":\{"userInfo":\{"user":\{[^}]*"uniqueId":"([^"]+)"/);
      const verified = detail?.[1]?.toLowerCase() === target.handle.toLowerCase();
      const notFound = /"webapp\.user-detail":\{"statusCode":(?:10202|10221)/.test(html);
      return { status: verified ? "verified" as const : notFound ? "not_found" as const : "unavailable" as const, ...target };
    }

    const verified = Boolean(title && html.toLowerCase().includes(`"canonicalbaseurl":"/@${target.handle.toLowerCase()}"`));
    return { status: verified ? "verified" as const : "unavailable" as const, ...target, displayName: verified ? title : undefined };
  } catch {
    return { status: "unavailable" as const, ...target };
  }
}
