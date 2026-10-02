export type SmmRoute = { provider: "smmworld"; serviceId: string };

// Provider service IDs are catalog configuration, not secrets.
const smmWorldRoutes: Record<string, string> = {
  "instagram-followers:standard": "6669",
  "instagram-followers:premium": "8106",
  "instagram-followers:usa-female": "5191",
  "instagram-followers:usa-male": "5190",
  "instagram-followers:europe": "4460",
  "instagram-likes:standard": "9457",
  "instagram-likes:premium": "8561",
  "instagram-likes:usa-europe": "6863",
  "instagram-views:standard": "7873",
  "instagram-comments:standard-comments": "2811",
  "instagram-comments:custom-comments": "3750",
  "instagram-comments:usa-comments": "9525",
  "tiktok-followers:standard": "7029",
  "tiktok-followers:premium": "8145",
  "tiktok-likes:standard": "6796",
  "tiktok-likes:premium": "9059",
  "tiktok-views:standard": "8150",
  "tiktok-comments:standard-comments": "7246",
  "tiktok-comments:custom-comments": "7247",
  "youtube-subscribers:standard": "7160",
  "youtube-subscribers:premium": "9376",
  "youtube-likes:standard": "10133",
  "youtube-likes:premium": "10134",
  "youtube-likes:usa": "10055",
  "youtube-views:standard": "5101",
  "youtube-views:high-retention": "1569",
  "youtube-views:usa": "8138",
  "youtube-comments:standard-comments": "585",
  "youtube-comments:custom-comments": "4794",
  "youtube-comments:usa-comments": "6466",
};

export function getSmmRoutes(serviceSlug: string, offerId: string): SmmRoute[] {
  const serviceId = smmWorldRoutes[`${serviceSlug}:${offerId}`];
  return serviceId ? [{ provider: "smmworld", serviceId }] : [];
}
