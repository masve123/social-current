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

  if (platform === "Instagram" && process.env.HIKER_API_KEY) {
    try {
      const url = new URL("https://api.hikerapi.com/v1/user/by/username");
      url.searchParams.set("username", target.handle);
      const response = await fetch(url, {
        headers: { "x-access-key": process.env.HIKER_API_KEY },
        cache: "no-store",
        signal: AbortSignal.timeout(6500),
      });
      if (response.status === 404) return { status: "not_found" as const, ...target };
      if (response.ok) {
        const profile = await response.json() as { username?: string; full_name?: string; is_private?: boolean };
        if (profile.username?.toLowerCase() === target.handle.toLowerCase()) {
          return { status: profile.is_private ? "private" as const : "verified" as const, ...target, displayName: profile.full_name || profile.username };
        }
      }
    } catch {
      // The public-page check below remains available when the profile API is down.
    }
  }

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
