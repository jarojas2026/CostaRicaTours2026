import type { BusinessGoal, Evidence } from './operationalTruthPolicy';

export type LiveInventoryRequest = {
  goal: BusinessGoal;
  correlationId: string;
  journeyId?: string;
  requirements: Record<string, unknown>;
};

export type LiveInventoryObservation = {
  source: string;
  sourceType: 'provider_api' | 'inventory_api';
  authoritative: true;
  observedAt: string;
  expiresAt?: string;
  facts: Record<string, unknown>;
  rawReference?: string;
};

export type LiveInventoryGatewayResult =
  | { status: 'verified_observation'; observation: LiveInventoryObservation }
  | { status: 'not_configured'; reason: string }
  | { status: 'unverified'; reason: string; observation?: Partial<LiveInventoryObservation> }
  | { status: 'error'; reason: string };

const clean = (value: unknown, max = 1000) => String(value ?? '').trim().slice(0, max);
const REQUIRED_FACTS: Partial<Record<BusinessGoal, string[]>> = {
  lodging_quote: ['availability', 'finalPrice'],
  tour_quote: ['availability', 'finalPrice'],
  transport_quote: ['availability', 'finalPrice'],
  reservation: ['availability', 'serverAuthoritativePrice']
};

function configuredEndpoint(goal: BusinessGoal) {
  if (goal === 'lodging_quote') return process.env.LODGING_INVENTORY_API_URL || '';
  if (goal === 'tour_quote' || goal === 'reservation') return process.env.TOUR_INVENTORY_API_URL || '';
  if (goal === 'transport_quote') return process.env.TRANSPORT_INVENTORY_API_URL || '';
  if (goal === 'itinerary_quote') return process.env.ITINERARY_INVENTORY_API_URL || '';
  return '';
}

function validateEndpoint(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('live_inventory_endpoint_invalid_url'); }
  const isProd = process.env.NODE_ENV === 'production';
  const localDev = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && (isProd || !localDev)) throw new Error('live_inventory_endpoint_https_required');

  const allowedHosts = String(process.env.LIVE_INVENTORY_ALLOWED_HOSTS || '')
    .split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  if (isProd && allowedHosts.length && !allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error('live_inventory_endpoint_host_not_allowed');
  }
  if (isProd && /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)) {
    throw new Error('live_inventory_endpoint_private_network_denied');
  }
  return url.toString();
}

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  timer.unref?.();
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export function validateLiveInventoryObservation(goal: BusinessGoal, value: unknown): LiveInventoryGatewayResult {
  if (!value || typeof value !== 'object') return { status: 'unverified', reason: 'Inventory adapter returned no structured observation.' };
  const data = value as any;
  const observedAt = clean(data.observedAt, 80);
  const observedMs = Date.parse(observedAt);
  if (!Number.isFinite(observedMs) || observedMs > Date.now() + 60_000 || Date.now() - observedMs > 30 * 60_000) {
    return { status: 'unverified', reason: 'Inventory observation is missing a fresh observedAt timestamp.' };
  }
  if (data.authoritative !== true) {
    return { status: 'unverified', reason: 'Inventory adapter did not mark the observation as authoritative.' };
  }
  if (!['provider_api', 'inventory_api'].includes(String(data.sourceType))) {
    return { status: 'unverified', reason: 'Inventory adapter sourceType is not eligible for live verification.' };
  }
  if (!data.facts || typeof data.facts !== 'object' || Array.isArray(data.facts)) {
    return { status: 'unverified', reason: 'Inventory adapter returned no facts object.' };
  }
  const required = REQUIRED_FACTS[goal] || [];
  const missing = required.filter(key => data.facts[key] === undefined || data.facts[key] === null || data.facts[key] === '');
  if (missing.length) {
    return { status: 'unverified', reason: `Inventory observation is missing required facts: ${missing.join(', ')}.` };
  }
  if (data.expiresAt) {
    const expiresMs = Date.parse(String(data.expiresAt));
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      return { status: 'unverified', reason: 'Inventory observation is already expired.' };
    }
  }

  return {
    status: 'verified_observation',
    observation: {
      source: clean(data.source, 240) || 'configured_inventory_gateway',
      sourceType: data.sourceType,
      authoritative: true,
      observedAt,
      expiresAt: data.expiresAt ? clean(data.expiresAt, 80) : undefined,
      facts: data.facts,
      rawReference: data.rawReference ? clean(data.rawReference, 600) : undefined
    }
  };
}

export function observationEvidence(observation: LiveInventoryObservation): Evidence {
  return {
    source: observation.sourceType,
    authoritative: true,
    observedAt: observation.observedAt,
    expiresAt: observation.expiresAt,
    reference: observation.rawReference || observation.source
  };
}

export async function queryLiveInventory(input: LiveInventoryRequest): Promise<LiveInventoryGatewayResult> {
  const rawEndpoint = configuredEndpoint(input.goal);
  if (!rawEndpoint) {
    return { status: 'not_configured', reason: `No live inventory adapter is configured for ${input.goal}.` };
  }

  let endpoint: string;
  try { endpoint = validateEndpoint(rawEndpoint); }
  catch (error: any) { return { status: 'error', reason: clean(error?.message, 300) || 'Inventory endpoint rejected by security policy.' }; }

  const timeout = timeoutSignal(Math.max(1500, Math.min(15000, Number(process.env.LIVE_INVENTORY_TIMEOUT_MS || 7000))));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': clean(input.correlationId, 160),
        ...(process.env.LIVE_INVENTORY_API_TOKEN ? { authorization: `Bearer ${process.env.LIVE_INVENTORY_API_TOKEN}` } : {})
      },
      body: JSON.stringify({
        goal: input.goal,
        correlationId: input.correlationId,
        journeyId: input.journeyId || null,
        requirements: input.requirements
      }),
      signal: timeout.signal
    });
    if (!response.ok) return { status: 'error', reason: `Inventory adapter HTTP ${response.status}.` };
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) return { status: 'error', reason: 'Inventory adapter did not return JSON.' };
    const data = await response.json();
    return validateLiveInventoryObservation(input.goal, data);
  } catch (error: any) {
    return { status: 'error', reason: error?.name === 'AbortError' ? 'Inventory adapter timed out.' : clean(error?.message, 600) || 'Inventory adapter failed.' };
  } finally {
    timeout.clear();
  }
}
