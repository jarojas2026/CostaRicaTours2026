/** Passive, instance-local observations. Reading health never invokes a paid model. */
export type AiFailure = 'configuration_missing' | 'authentication' | 'permission' | 'quota' | 'model_unavailable' | 'timeout' | 'provider_error';
type Observation = { at: number; failure: AiFailure | null };
const observations = new Map<string, Observation>();
const FRESH_MS = 5 * 60_000;

export function classifyAiFailure(error: unknown): AiFailure {
  const e = error as { status?: number; code?: number; message?: string };
  const status = Number(e?.status || e?.code);
  const message = String(e?.message || '');
  if (status === 401 || /API_KEY_INVALID|API key not valid|invalid_grant/i.test(message)) return 'authentication';
  if (status === 403) return 'permission';
  if (status === 429) return 'quota';
  if (status === 404) return 'model_unavailable';
  if (status === 408 || status === 504 || /timeout|timed out|aborted/i.test(message)) return 'timeout';
  return 'provider_error';
}

export function recordAiObservation(provider: 'gemini' | 'claude', failure: AiFailure | null, now = Date.now()) {
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
  const vertex = env.GOOGLE_GENAI_USE_VERTEXAI?.toLowerCase() === 'true';
  const key = env.GEMINI_API_KEY?.trim();
  const geminiConfigured = vertex
    ? Boolean((env.GOOGLE_CLOUD_PROJECT || env.GCP_PROJECT) && (env.GOOGLE_CLOUD_LOCATION || env.VERTEX_AI_REGION))
    : Boolean(key && !key.startsWith('AQ.') && key.length >= 20);
  const configured = {
    gemini: geminiConfigured,
    claude: Boolean(env.ANTHROPIC_VERTEX_MODEL && (env.ANTHROPIC_VERTEX_PROJECT_ID || env.GCP_PROJECT || env.GOOGLE_CLOUD_PROJECT)),
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
      : providers.some(p => p.status === 'unknown') ? 'unknown' : 'degraded',
    scope: 'instance_observations',
    maxAgeSeconds: FRESH_MS / 1000,
    providers,
  };
}
