/**
 * Sondeo de salud de IA a costo cero (#379 / backlog M4).
 *
 * /api/health/ai se basaba solo en observaciones pasivas de la instancia: en Cloud Run
 * cada instancia nueva (o sin tráfico de IA en 5 min) respondía "unknown". Este sondeo
 * consulta el LISTADO DE MODELOS del proveedor (no genera texto, no consume tokens ni
 * crédito) y registra el resultado como una observación más. Así el estado refleja si la
 * clave y el proveedor responden de verdad.
 *
 * - Interruptor: AI_HEALTH_PROBE_ENABLED=false lo apaga (vuelve a la conducta pasiva).
 * - Nunca corre en tests (NODE_ENV=test) salvo que se inyecte un fetch.
 * - Single-flight y como máximo un sondeo por proveedor cada PROBE_INTERVAL_MS.
 * - Tope de tiempo por proveedor; nunca registra claves, URLs con clave ni cuerpos.
 */
import { getOpenAiCompatConfig, isGeminiConfigured, isOpenAiCompatConfigured, type AiProviderName } from './aiConfig';
import { classifyAiFailure, recordAiObservation, type AiFailure } from './aiHealth';

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number }>;

export const PROBE_INTERVAL_MS = 4 * 60_000;
const PROBE_TIMEOUT_MS = 3_000;
const lastProbeAt = new Map<string, number>();
let inFlight: Promise<void> | null = null;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function isAiHealthProbeEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (str(env.AI_HEALTH_PROBE_ENABLED).toLowerCase() === 'false') return false;
  return env.NODE_ENV !== 'test';
}

type ProbeTarget = { provider: AiProviderName; url: string; headers: Record<string, string> };

export function probeTargets(env: NodeJS.ProcessEnv = process.env): ProbeTarget[] {
  const targets: ProbeTarget[] = [];
  // Gemini por API key (no Vertex: Vertex usa ADC y no tiene listado gratuito por clave).
  if (isGeminiConfigured(env) && str(env.GOOGLE_GENAI_USE_VERTEXAI).toLowerCase() !== 'true') {
    targets.push({
      provider: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      headers: { 'x-goog-api-key': str(env.GEMINI_API_KEY) },
    });
  }
  if (isOpenAiCompatConfigured(env)) {
    targets.push({
      provider: 'openai_compat',
      url: `${getOpenAiCompatConfig(env).baseUrl}/models`,
      headers: { authorization: `Bearer ${str(env.OPENAI_COMPAT_API_KEY)}` },
    });
  }
  return targets;
}

async function probeOne(target: ProbeTarget, fetchImpl: FetchLike, timeoutMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  timer.unref?.();
  let failure: AiFailure | null = null;
  try {
    const res = await fetchImpl(target.url, { method: 'GET', headers: target.headers, signal: ctrl.signal });
    if (!res.ok) failure = classifyAiFailure({ status: res.status });
  } catch (err: any) {
    failure = classifyAiFailure({ message: err?.name === 'AbortError' ? 'timeout' : 'network error' });
  } finally {
    clearTimeout(timer);
  }
  recordAiObservation(target.provider, failure);
}

/**
 * Sondea los proveedores con clave cuyo último sondeo sea más viejo que el intervalo.
 * Nunca lanza. Con el interruptor apagado no hace nada.
 */
export async function probeAiProviders(options: { env?: NodeJS.ProcessEnv; fetchImpl?: FetchLike; now?: number; timeoutMs?: number } = {}) {
  const env = options.env || process.env;
  if (!options.fetchImpl && !isAiHealthProbeEnabled(env)) return;
  if (inFlight) return inFlight;
  const now = options.now ?? Date.now();
  const due = probeTargets(env).filter((t) => now - (lastProbeAt.get(t.provider) ?? 0) >= PROBE_INTERVAL_MS);
  if (!due.length) return;
  for (const t of due) lastProbeAt.set(t.provider, now);
  const fetchImpl = options.fetchImpl || (globalThis.fetch as unknown as FetchLike);
  inFlight = Promise.all(due.map((t) => probeOne(t, fetchImpl, options.timeoutMs ?? PROBE_TIMEOUT_MS)))
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Test helper. */
export function resetAiHealthProbe() { lastProbeAt.clear(); inFlight = null; }
