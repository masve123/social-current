import { getService } from "@/lib/services";
import { getServiceOffer } from "@/lib/smm-offers";
import { getSmmRoutes, type SmmRoute } from "@/lib/smm-routes";

export type ProviderId = "followiz" | "smmworld" | "smmpwr";

type PanelRecord = Record<string, string | number | boolean | undefined>;

export type PanelService = {
  service: number | string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill?: boolean;
  cancel?: boolean;
  dripfeed?: boolean;
};

export type PanelOrderStatus = {
  status?: string;
  charge?: string;
  start_count?: string;
  remains?: string;
  currency?: string;
};

type ProviderConfig = { id: ProviderId; endpoint: string; key: string };

const defaults: Record<ProviderId, string> = {
  followiz: "https://followiz.com/api/v2",
  smmworld: "https://smmworldpanel.com/api/v2",
  smmpwr: "https://smmpwr.com/api/v2",
};

class PanelApiError extends Error {
  constructor(message: string, readonly safeToFallback = false) {
    super(message);
  }
}

function providerConfig(provider: ProviderId): ProviderConfig {
  const prefix = provider.toUpperCase();
  const legacyKey = provider === "smmworld" ? process.env.SMM_PANEL_API_KEY : undefined;
  const legacyEndpoint = provider === "smmworld" ? process.env.SMM_PANEL_API_URL : undefined;
  const key = process.env[`SMM_${prefix}_API_KEY`] || legacyKey;
  const endpoint = process.env[`SMM_${prefix}_API_URL`] || legacyEndpoint || defaults[provider];
  if (!key) throw new Error(`${provider} API credentials are not configured.`);
  return { id: provider, endpoint, key };
}

async function panelRequest<T>(provider: ProviderId, payload: PanelRecord): Promise<T> {
  const config = providerConfig(provider);
  const body = new URLSearchParams({ key: config.key });
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) body.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new PanelApiError(`${provider} did not return a definite response. Check the provider before retrying.`);
  }

  const text = await response.text();
  let data: T & { error?: string };
  try {
    data = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new PanelApiError(`${provider} returned an invalid API response.`);
  }

  if (data.error) throw new PanelApiError(`${provider}: ${data.error}`, true);
  if (!response.ok) throw new PanelApiError(`${provider} request failed with status ${response.status}.`);
  return data;
}

export function getConfiguredRoutes(serviceSlug: string, offerId: string): SmmRoute[] {
  const service = getService(serviceSlug);
  if (!service) throw new Error("Unknown service.");
  const routes = getSmmRoutes(serviceSlug, offerId);
  if (routes.length) return routes;
  throw new Error(`No provider route is configured for ${service.shortTitle} / ${offerId}.`);
}

export async function createPanelOrder(input: {
  serviceSlug: string;
  offerId: string;
  link: string;
  quantity: number;
  comments?: string[];
  runs?: number;
  interval?: number;
}) {
  const service = getService(input.serviceSlug);
  if (!service) throw new Error("Unknown service.");
  const offer = getServiceOffer(service, input.offerId);
  if (offer.id !== input.offerId) throw new Error("Unknown service package.");
  const routes = getConfiguredRoutes(service.slug, offer.id);
  let lastError: Error | undefined;

  for (const route of routes) {
    try {
      const payload: PanelRecord = {
        action: "add",
        service: route.serviceId,
        link: input.link,
        quantity: offer.customComments ? undefined : input.quantity,
        comments: offer.customComments ? input.comments?.join("\n") : undefined,
        runs: input.runs,
        interval: input.interval,
      };
      const result = await panelRequest<{ order?: number | string; status?: string }>(route.provider, payload);
      if (!result.order) throw new PanelApiError(`${route.provider} did not return an order number.`);
      return { provider: route.provider, providerOrder: String(result.order), status: result.status || "Pending" };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("The provider rejected this order.");
      if (!(error instanceof PanelApiError) || !error.safeToFallback) break;
    }
  }

  throw lastError || new Error("No provider could accept this order.");
}

export function getPanelOrderStatus(provider: ProviderId, order: string) {
  return panelRequest<PanelOrderStatus>(provider, { action: "status", order });
}

export function requestPanelRefill(provider: ProviderId, order: string) {
  return panelRequest<{ refill?: number | string; status?: string }>(provider, { action: "refill", order });
}

export function requestPanelCancellation(provider: ProviderId, order: string) {
  return panelRequest<{ cancel?: number | string; status?: string }>(provider, { action: "cancel", order });
}

export function getPanelServices(provider: ProviderId) {
  return panelRequest<PanelService[]>(provider, { action: "services" });
}

export function getPanelBalance(provider: ProviderId) {
  return panelRequest<{ balance: string; currency: string }>(provider, { action: "balance" });
}
