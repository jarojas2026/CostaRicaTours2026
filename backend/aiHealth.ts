/** Passive, instance-local observations. Reading health never invokes a paid model. */
import { isClaudeConfigured, isGeminiConfigured, isOpenAiCompatConfigured, type AiProviderName } from './aiConfig';

export type AiFailure = 'configuration_missing' | 'billing' | 'authentication' | 'permission' | 'quota' | 'model_unavailable' | 'timeout' | 'provider_error';
type Observation = { at: number; failure: AiFailure | null };
const observations = new Map<string, Observation>();
const FRESH_MS = 5 * 60_000;

export function classifyAiFailure(error: unknown): AiFailure {
  const e = error as { status?: number; code?: number; message?: string };
  const status = Number(e?.status || e?.code);
  const message = String(e?.message || '');
  // Billing first: Gemini reports depleted prepayment credits as 429 RESOURCE_EXHAUSTED.
  if (status === 402 || /prepayment credits are depleted|billing/i.test(message)) return 'billing';
  if (status === 401 || /API_KEY_INVALID|API key not valid|invalid_grant/i.test(message)) return 'authentication';
  if (status === 403) return 'permission';
  if (status === 429) return 'quota';
  if (status === 404) return 'model_unavailable';
  if (status === 408 || status === 504 || /timeout|timed out|aborted/i.test(message)) return 'timeout';
  return 'provider_error';
}

export function recordAiObservation(provider: AiProviderName, failure: AiFailure | null, now = Date.now()) {
  const previous = observations.get(provider);
  observations.set(provider, { at: now, failure });
  if (failure && (!previous || previous.failure !== failure || now - previous.at >= FRESH_MS)) {
    // Fixed categories only: never log SDK errors, prompts, keys or account identifiers.
    console.warn(JSON.stringify({ event: 'ai_provider_degraded', provider, reason: failure }));
  } else if (!failure && previous?.failure) {
    console.info(JSON.stringify({ event: 'ai_provider_recovered', provider }));
  }
}

export function getAiHealth(env: NodeJS.ProcessEnv = process.env, now = Date.now()) {
  const configured = {
    gemini: isGeminiConfigured(env),
    claude: isClaudeConfigured(env),
    openai_compat: isOpenAiCompatConfigured(env),
  };
  const providers = Object.entries(configured).map(([provider, ready]) => {
    const last = observations.get(provider);
    const fresh = last && now - last.at < FRESH_MS;
    return {
      provider,
      status: !ready ? 'unconfigured' : !fresh ? 'unknown' : last.failure ? 'degraded' : 'available',
      reason: !ready ? 'configuration_missing' : fresh ? last.failure : null,
      checkedAt: last ? new Date(last.at).toISOString() : null,
    };
  });
  return {
    status: providers.some(p => p.status === 'available') ? 'available'
      : providers.some(p => p.status === 'unknown') ? 'unknown'
        : providers.every(p => p.status === 'unconfigured') ? 'unconfigured' : 'degraded',
    scope: 'instance_observations',
    maxAgeSeconds: FRESH_MS / 1000,
    providers,
  };
}

/**
 * HTTP status for /api/health/ai: 200 for available, unknown and unconfigured (the
 * status travels in the body); 503 only when every configured provider is degraded.
 */
export function aiHealthHttpStatus(providers: Array<{ status: string }>) {
  const configured = providers.filter(p => p.status !== 'unconfigured');
  return configured.length > 0 && configured.every(p => p.status === 'degraded') ? 503 : 200;
}

/** Test helper: forget instance-local observations. */
export function resetAiObservations() { observations.clear(); }
