/**
 * Fuente única de verdad para la configuración de IA (proveedores, modelos y límites).
 *
 * Ningún otro archivo de backend/ o api/ debe escribir nombres de modelo a mano:
 * usa los getters de este módulo (lo verifica tests/aiRouter.contract.test.ts).
 *
 * Variables de entorno:
 * - AI_PROVIDER            auto | gemini | claude | none (por defecto auto). Es una preferencia
 *                          de orden, no un interruptor de gasto: `none` no bloquea un proveedor
 *                          configurado (se comporta como auto). El gasto cero se garantiza porque
 *                          la clave pertenece a un proyecto sin facturación.
 * - AI_FALLBACK_ENABLED    true | false (por defecto true): probar el siguiente proveedor si falla.
 * - AI_MAX_COST_USD        número (por defecto 0). 0 significa "prohibido consumo facturable":
 *                          todo proveedor listado en AI_BILLABLE_PROVIDERS queda desactivado
 *                          mientras AI_MAX_COST_USD sea 0. Los no listados se consideran sin
 *                          facturación (proyecto sin billing) y se pueden usar.
 * - AI_BILLABLE_PROVIDERS  lista separada por comas (gemini,claude) que el operador marca como
 *                          facturables. Vacía por defecto.
 * - AI_ALLOW_EXTERNAL_PII  true | false (por defecto false): si es false, emails, teléfonos y
 *                          números de documento se redactan antes de salir hacia un proveedor.
 * - AI_REQUEST_TIMEOUT_MS  por defecto 12000 (acotado entre 1000 y 60000).
 * - GEMINI_MODEL           modelo del concierge (por defecto el de #255).
 * - GEMINI_MODEL_LIGHT     modelo para tareas internas; si falta se usa GEMINI_MODEL y, si
 *                          tampoco existe, el modelo interno histórico.
 * - GEMINI_EMBEDDING_MODEL modelo de embeddings (memoria semántica).
 * - CLAUDE_MODEL / ANTHROPIC_VERTEX_MODEL  modelo de Claude en Vertex AI.
 * - OPENAI_COMPAT_BASE_URL / OPENAI_COMPAT_API_KEY / OPENAI_COMPAT_MODEL  proveedor
 *                          OpenAI-compatible (Groq gratis por defecto: https://api.groq.com/openai/v1).
 * - OPENAI_COMPAT_REASONING_EFFORT  low | medium | high (por defecto low; con gpt-oss evita
 *                          respuestas vacías por consumir el presupuesto en razonamiento).
 * - OPENAI_COMPAT_MAX_TOKENS  por defecto 700 (acotado 100-4000).
 * - GROQ_MODEL             modelo principal del proveedor OpenAI-compatible (tiene prioridad
 *                          sobre OPENAI_COMPAT_MODEL). Por defecto openai/gpt-oss-120b, el más
 *                          potente del plan gratuito de Groq (https://console.groq.com/docs/rate-limits).
 * - GROQ_MODEL_FALLBACK    modelo más pequeño al que se cae ante 429/5xx/errores de red del
 *                          principal (por defecto openai/gpt-oss-20b, también en el plan gratuito).
 *                          `none` u `off` desactiva el respaldo.
 */

export type AiProviderName = 'gemini' | 'claude' | 'openai_compat';
export type AiProviderPreference = 'auto' | AiProviderName | 'none';

// Valores por defecto: se conservan exactamente los que ya usaba el código.
const DEFAULT_CONCIERGE_MODEL = 'gemini-3.5-flash';
const DEFAULT_INTERNAL_MODEL = 'gemini-2.5-flash';
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';
const DEFAULT_CLAUDE_MODEL = 'claude-3-5-sonnet-v2@20241022';
const DEFAULT_OPENAI_COMPAT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_OPENAI_COMPAT_FALLBACK_MODEL = 'openai/gpt-oss-20b';

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;

const str = (value: string | undefined) => (value ?? '').trim();
const bool = (value: string | undefined, fallback: boolean) => {
  const v = str(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  return fallback;
};

export function getAiConfig(env: Env = process.env) {
  const rawProvider = str(env.AI_PROVIDER).toLowerCase();
  const provider: AiProviderPreference = (['auto', 'gemini', 'claude', 'openai_compat', 'none'] as const).includes(rawProvider as AiProviderPreference)
    ? rawProvider as AiProviderPreference : 'auto';
  const cost = Number(str(env.AI_MAX_COST_USD) || '0');
  const timeout = Number(str(env.AI_REQUEST_TIMEOUT_MS) || '12000');
  const billableProviders = str(env.AI_BILLABLE_PROVIDERS).toLowerCase().split(',').map(s => s.trim())
    .filter((p): p is AiProviderName => p === 'gemini' || p === 'claude' || p === 'openai_compat');
  return {
    provider,
    fallbackEnabled: bool(env.AI_FALLBACK_ENABLED, true),
    maxCostUsd: Number.isFinite(cost) && cost > 0 ? cost : 0,
    allowExternalPii: bool(env.AI_ALLOW_EXTERNAL_PII, false),
    requestTimeoutMs: Number.isFinite(timeout) ? Math.min(60_000, Math.max(1_000, Math.round(timeout))) : 12_000,
    billableProviders,
  };
}

/** Modelo del concierge (conversación con herramientas). */
export function getConciergeModel(env: Env = process.env) {
  return str(env.GEMINI_MODEL) || DEFAULT_CONCIERGE_MODEL;
}

/** Modelo para tareas internas (clasificación, resúmenes, pronósticos, fraude...). */
export function getLightModel(env: Env = process.env) {
  return str(env.GEMINI_MODEL_LIGHT) || str(env.GEMINI_MODEL) || DEFAULT_INTERNAL_MODEL;
}

export function getEmbeddingModel(env: Env = process.env) {
  return str(env.GEMINI_EMBEDDING_MODEL) || DEFAULT_EMBEDDING_MODEL;
}

export function getSkillEvolutionModel(env: Env = process.env) {
  return str(env.SKILL_EVOLUTION_MODEL) || getLightModel(env);
}

export function getClaudeModel(env: Env = process.env) {
  return str(env.CLAUDE_MODEL) || str(env.ANTHROPIC_VERTEX_MODEL) || DEFAULT_CLAUDE_MODEL;
}

/** Claude solo cuenta como configurado si el operador eligió un modelo y hay proyecto GCP. */
export function isClaudeConfigured(env: Env = process.env) {
  return Boolean((str(env.CLAUDE_MODEL) || str(env.ANTHROPIC_VERTEX_MODEL))
    && (str(env.ANTHROPIC_VERTEX_PROJECT_ID) || str(env.GCP_PROJECT) || str(env.GOOGLE_CLOUD_PROJECT)));
}

export function isGeminiConfigured(env: Env = process.env) {
  if (str(env.GOOGLE_GENAI_USE_VERTEXAI).toLowerCase() === 'true') {
    return Boolean((str(env.GOOGLE_CLOUD_PROJECT) || str(env.GCP_PROJECT)) && (str(env.GOOGLE_CLOUD_LOCATION) || str(env.VERTEX_AI_REGION)));
  }
  const key = str(env.GEMINI_API_KEY);
  return Boolean(key && !key.startsWith('AQ.') && key.length >= 20);
}

export function getOpenAiCompatConfig(env: Env = process.env) {
  const effort = str(env.OPENAI_COMPAT_REASONING_EFFORT).toLowerCase();
  const maxTokens = Number(str(env.OPENAI_COMPAT_MAX_TOKENS) || '700');
  const model = str(env.GROQ_MODEL) || str(env.OPENAI_COMPAT_MODEL) || DEFAULT_OPENAI_COMPAT_MODEL;
  const rawFallback = str(env.GROQ_MODEL_FALLBACK);
  const fallbackModel = ['none', 'off', 'false', '0'].includes(rawFallback.toLowerCase()) ? ''
    : (rawFallback || DEFAULT_OPENAI_COMPAT_FALLBACK_MODEL);
  return {
    baseUrl: str(env.OPENAI_COMPAT_BASE_URL).replace(/\/+$/, ''),
    model,
    /** Modelo de respaldo (vacío = sin respaldo o igual al principal). */
    fallbackModel: fallbackModel && fallbackModel !== model ? fallbackModel : '',
    reasoningEffort: (['low', 'medium', 'high'].includes(effort) ? effort : 'low') as 'low' | 'medium' | 'high',
    maxTokens: Number.isFinite(maxTokens) ? Math.min(4000, Math.max(100, Math.round(maxTokens))) : 700,
  };
}

/** Proveedor OpenAI-compatible (Groq/OpenRouter): URL https y clave presente. */
export function isOpenAiCompatConfigured(env: Env = process.env) {
  const url = str(env.OPENAI_COMPAT_BASE_URL);
  const key = str(env.OPENAI_COMPAT_API_KEY);
  return /^https:\/\/[^\s]+$/i.test(url) && key.length >= 20;
}

export function isProviderConfigured(provider: AiProviderName, env: Env = process.env) {
  if (provider === 'openai_compat') return isOpenAiCompatConfigured(env);
  return provider === 'gemini' ? isGeminiConfigured(env) : isClaudeConfigured(env);
}

/** Proveedor bloqueado por la política de costo cero (marcado facturable con presupuesto 0). */
export function isBillingBlocked(provider: AiProviderName, env: Env = process.env) {
  const cfg = getAiConfig(env);
  return cfg.maxCostUsd === 0 && cfg.billableProviders.includes(provider);
}

/** Orden de proveedores a intentar. auto/none conservan el orden histórico: Claude (si está configurado) y luego Gemini. */
export function providerOrder(env: Env = process.env): AiProviderName[] {
  const cfg = getAiConfig(env);
  const base: AiProviderName[] = cfg.provider === 'gemini' ? ['gemini', 'claude', 'openai_compat']
    : cfg.provider === 'openai_compat' ? ['openai_compat', 'claude', 'gemini'] : ['claude', 'gemini', 'openai_compat'];
  const usable = base.filter(p => isProviderConfigured(p, env) && !isBillingBlocked(p, env));
  if (cfg.fallbackEnabled) return usable;
  // Sin fallback: solo el proveedor preferido (o el primero disponible en auto/none).
  return cfg.provider === 'gemini' || cfg.provider === 'claude' || cfg.provider === 'openai_compat'
    ? usable.filter(p => p === cfg.provider) : usable.slice(0, 1);
}
