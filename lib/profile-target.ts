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
    if (platform === "YouTube" && segments.length === 2 && (
      (segments[0] === "channel" && /^UC[a-zA-Z0-9_-]{22}$/.test(segments[1]))
      || (["c", "user"].includes(segments[0]) && /^[a-zA-Z0-9._-]{1,100}$/.test(segments[1]))
    )) {
      return { handle: segments[1], url: `https://www.youtube.com/${segments[0]}/${segments[1]}` };
    }
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
  if (platform === "Instagram" && ["p", "reel", "reels", "stories", "explore", "accounts", "direct"].includes(handle.toLowerCase())) return null;

  const url = platform === "Instagram"
    ? `https://www.instagram.com/${handle}/`
    : platform === "TikTok"
      ? `https://www.tiktok.com/@${handle}`
      : `https://www.youtube.com/@${handle}`;
  return { handle, url };
}

export function parseOrderTarget(service: Service, input: string) {
  if (isProfileService(service)) return parseProfileTarget(service.platform, input);
  if (typeof input !== "string" || input.length > 2048) return null;
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (service.platform === "Instagram") {
    if (!["instagram.com", "www.instagram.com"].includes(host) || !/^\/(?:p|reel|reels|tv)\/[a-zA-Z0-9_-]+\/?$/.test(path)) return null;
    url.search = "";
  } else if (service.platform === "TikTok") {
    const short = ["vm.tiktok.com", "vt.tiktok.com"].includes(host) && /^\/[a-zA-Z0-9]+\/?$/.test(path);
    const full = ["tiktok.com", "www.tiktok.com"].includes(host) && /^\/(?:@[a-zA-Z0-9._]+\/video\/\d+|t\/[a-zA-Z0-9]+)\/?$/.test(path);
    if (!short && !full) return null;
    url.search = "";
  } else {
    const videoId = host === "youtu.be" ? path.slice(1).replace(/\/$/, "")
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
        ? path === "/watch" ? url.searchParams.get("v") : path.match(/^\/(?:shorts|live|embed)\/([a-zA-Z0-9_-]+)\/?$/)?.[1]
        : null;
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
    return { url: `https://www.youtube.com/watch?v=${videoId}` };
  }
  url.hash = "";
  return { url: url.toString() };
}
