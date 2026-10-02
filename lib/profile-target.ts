import type { Service } from "@/lib/services";

export function isProfileService(service: Service) {
  return service.metric === "followers" || service.metric === "subscribers";
}

export function parseProfileTarget(platform: Service["platform"], input: string) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 200) return null;

  let handle = raw.replace(/^@/, "");
  if (raw.startsWith("https://")) {
    let url: URL;
    try { url = new URL(raw); } catch { return null; }
    const hostname = url.hostname.toLowerCase();
    const allowed = platform === "Instagram"
      ? ["instagram.com", "www.instagram.com"]
      : platform === "TikTok"
        ? ["tiktok.com", "www.tiktok.com"]
        : ["youtube.com", "www.youtube.com", "m.youtube.com"];
    if (!allowed.includes(hostname) || url.username || url.password || url.port) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return null;
    handle = segments[0].replace(/^@/, "");
  } else if (raw.includes("://") || raw.includes("/")) {
    return null;
  }

  const valid = platform === "Instagram"
    ? /^[a-zA-Z0-9._]{1,30}$/.test(handle)
    : platform === "TikTok"
      ? /^[a-zA-Z0-9._]{1,24}$/.test(handle)
      : /^[a-zA-Z0-9._-]{3,30}$/.test(handle);
  if (!valid) return null;

  const url = platform === "Instagram"
    ? `https://www.instagram.com/${handle}/`
    : platform === "TikTok"
      ? `https://www.tiktok.com/@${handle}`
      : `https://www.youtube.com/@${handle}`;
  return { handle, url };
}
