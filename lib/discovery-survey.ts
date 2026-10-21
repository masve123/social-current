export const discoverySources = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "google", label: "Google" },
  { id: "youtube", label: "YouTube" },
  { id: "facebook", label: "Facebook" },
  { id: "reddit", label: "Reddit" },
  { id: "friend", label: "A friend" },
  { id: "other", label: "Other" },
] as const;

export function parseDiscoveryAnswer(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(key => !["order", "source", "other"].includes(key))
    || typeof data.order !== "string" || !/^SC-\d{6}-[A-F0-9]{16}$/.test(data.order)
    || !discoverySources.some(source => source.id === data.source)) return null;
  if (data.source === "other") {
    if (typeof data.other !== "string") return null;
    const other = data.other.trim();
    if (!other || other.length > 200 || /[\x00-\x1f\x7f]/.test(other)) return null;
    return { order: data.order, source: "other", other };
  }
  if (data.other !== undefined && data.other !== "") return null;
  return { order: data.order, source: data.source as string, other: null };
}
