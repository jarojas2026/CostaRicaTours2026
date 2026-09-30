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
  if (!Number.isFinite(observedMs) || Math.abs(Date.now() - observedMs) > 30 * 60_000) {
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
  const endpoint = configuredEndpoint(input.goal);
  if (!endpoint) {
    return { status: 'not_configured', reason: `No live inventory adapter is configured for ${input.goal}.` };
  }

  const timeout = timeoutSignal(Math.max(1500, Math.min(15000, Number(process.env.LIVE_INVENTORY_TIMEOUT_MS || 7000))));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
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
    const data = await response.json();
    return validateLiveInventoryObservation(input.goal, data);
  } catch (error: any) {
    return { status: 'error', reason: error?.name === 'AbortError' ? 'Inventory adapter timed out.' : clean(error?.message, 600) || 'Inventory adapter failed.' };
  } finally {
    timeout.clear();
  }
}
