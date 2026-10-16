/**
 * Router de proveedores de IA: elige proveedor, protege PII, aplica timeout y
 * circuit breaker, y registra observaciones de salud. Si no hay proveedor
 * utilizable devuelve { provider: 'none' } para que quien llama use su fallback
 * determinista (knowledgeReplies / getKnowledgeBaseReply).
 *
 * Costo cero: AI_MAX_COST_USD=0 significa "prohibido consumo facturable". El
 * router no estima gasto; la garantía es que la clave pertenece a un proyecto sin
 * facturación. Si el operador marca un proveedor como facturable
 * (AI_BILLABLE_PROVIDERS=gemini,...), ese proveedor se desactiva mientras
 * AI_MAX_COST_USD sea 0. AI_PROVIDER=none no bloquea un proveedor configurado.
 */
import type { GoogleGenAI } from '@google/genai';
import { classifyAiFailure, recordAiObservation, type AiFailure } from './aiHealth';
import {
  getAiConfig, getClaudeModel, getConciergeModel, getLightModel, isBillingBlocked, isProviderConfigured, providerOrder,
  type AiProviderName,
} from './aiConfig';
import { getGeminiClient } from './geminiRuntime';
import { scrubText } from '../shared/observability/scrubPii';

export type AiTask = 'concierge' | 'concierge_classifier' | 'grounded_search' | 'counter_desk' | 'forecast'
  | 'email' | 'fraud' | 'booking_insights' | 'notification' | 'itinerary' | 'learning' | 'photo'
  | 'provider_inbox' | 'skill_evolution' | 'internal';

// ---------------------------------------------------------------------------
// Redacción de PII
// ---------------------------------------------------------------------------

// Cédula costarricense (1-0234-0567 / 1 0234 0567), DIMEX (11-12 dígitos) y pasaportes (A1234567).
const CEDULA = /(?<![\w-])\d{1,2}[-\s]\d{3,4}[-\s]\d{3,5}(?![\w-])/g;
const PASSPORT = /\b[A-Z]{1,2}\d{6,9}\b/g;
const LONG_ID = /(?<![\w-])\d{9,12}(?![\w-])/g;

/** Redacta emails, teléfonos y números de documento (reutiliza scrubText de observabilidad). */
export function redactPii(text: string): string {
  return scrubText(String(text ?? '')
    .replace(CEDULA, '[documento]')
    .replace(PASSPORT, '[documento]'))
    .replace(LONG_ID, '[documento]');
}

/** Redacta solo campos de texto y respuestas de herramientas; nunca ids, firmas ni nombres de funciones. */
export function redactContents<T>(contents: T, depth = 0): T {
  if (depth > 10) return contents;
  if (typeof contents === 'string') return redactPii(contents) as T;
  if (Array.isArray(contents)) return contents.map(c => redactContents(c, depth + 1)) as T;
  if (contents && typeof contents === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(contents as Record<string, unknown>)) {
      if (key === 'text' && typeof value === 'string') out[key] = redactPii(value);
      else if (key === 'parts' || key === 'response' || key === 'result' || key === 'functionResponse') out[key] = redactDeep(value, depth + 1);
      else if (Array.isArray(value)) out[key] = redactContents(value, depth + 1);
      else out[key] = value;
    }
    return out as T;
  }
  return contents;
}

const SKIP_KEYS = new Set(['thoughtSignature', 'thought_signature', 'id', 'name', 'role', 'inlineData', 'fileData']);
function redactDeep(value: unknown, depth: number): unknown {
  if (depth > 10) return value;
  if (typeof value === 'string') return redactPii(value);
  if (Array.isArray(value)) return value.map(v => redactDeep(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SKIP_KEYS.has(k) ? v : redactDeep(v, depth + 1);
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Circuit breaker por proveedor (estado local de la instancia)
// ---------------------------------------------------------------------------

type BreakerKey = AiProviderName | `${AiProviderName}:search`;
type Breaker = { openUntil: number; reason: AiFailure };
const breakers = new Map<BreakerKey, Breaker>();

export const BREAKER_COOLDOWN_MS: Partial<Record<AiFailure, number>> = {
  billing: 30 * 60_000,
  authentication: 30 * 60_000,
  permission: 30 * 60_000,
  quota: 5 * 60_000,
  provider_error: 60_000,
  timeout: 60_000,
};
const RETRYABLE: ReadonlySet<AiFailure> = new Set(['provider_error', 'timeout']);

function isOpen(key: BreakerKey, now: number) {
  const b = breakers.get(key);
  if (!b) return false;
  if (b.openUntil <= now) { breakers.delete(key); return false; }
  return true;
}

/** Un proveedor caído también apaga su búsqueda; la búsqueda caída no apaga al proveedor. */
export function isBreakerOpen(key: BreakerKey, now = Date.now()) {
  const provider = key.split(':')[0] as AiProviderName;
  return isOpen(provider, now) || (key !== provider && isOpen(key, now));
}

export function tripBreaker(key: BreakerKey, failure: AiFailure, now = Date.now()) {
  const cooldown = BREAKER_COOLDOWN_MS[failure];
  if (!cooldown) return false;
  breakers.set(key, { openUntil: now + cooldown, reason: failure });
  console.warn(JSON.stringify({ event: 'ai_breaker_open', provider: key, reason: failure, cooldownSeconds: cooldown / 1000 }));
  return true;
}

export function resetBreakers() { breakers.clear(); }

/** Estado público del breaker: sin secretos ni PII. */
export function getBreakerStates(now = Date.now()) {
  const keys: BreakerKey[] = ['gemini', 'gemini:search', 'claude'];
  return keys.map(key => {
    const open = isOpen(key, now);
    const b = breakers.get(key);
    return { provider: key, state: open ? 'open' as const : 'closed' as const, openUntil: open && b ? new Date(b.openUntil).toISOString() : null, reason: open && b ? b.reason : null };
  });
}

// ---------------------------------------------------------------------------
// Llamada protegida
// ---------------------------------------------------------------------------

export class AiUnavailableError extends Error {
  constructor(public readonly provider: AiProviderName, public readonly reason: string) {
    super(`ai_provider_unavailable:${provider}:${reason}`);
    this.name = 'AiUnavailableError';
  }
}

function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error('AI request timed out'), { status: 408 }));
    }, ms);
  });
  return Promise.race([fn(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

/** Razón por la que un proveedor no puede usarse ahora, o null si está disponible. */
export function unavailableReason(key: BreakerKey, env: NodeJS.ProcessEnv = process.env, now = Date.now()): string | null {
  const provider = key.split(':')[0] as AiProviderName;
  if (!isProviderConfigured(provider, env)) return 'configuration_missing';
  if (isBillingBlocked(provider, env)) return 'billing_blocked';
  if (isBreakerOpen(key, now)) return 'breaker_open';
  return null;
}

/**
 * Ejecuta una llamada a un proveedor con breaker, timeout, máximo un reintento
 * (solo 5xx/timeout, sin bucles), latencia y observación de salud. Lanza el error
 * original o AiUnavailableError para que el try/catch existente de quien llama
 * siga aplicando su fallback.
 */
export async function callProvider<T>(
  key: BreakerKey,
  task: AiTask,
  fn: (signal: AbortSignal) => Promise<T>,
  opts: { timeoutMs?: number; now?: () => number } = {},
): Promise<T> {
  const provider = key.split(':')[0] as AiProviderName;
  const now = opts.now ?? Date.now;
  const blocked = unavailableReason(key, process.env, now());
  if (blocked) throw new AiUnavailableError(provider, blocked);
  const timeoutMs = opts.timeoutMs ?? getAiConfig().requestTimeoutMs;
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = now();
    try {
      const value = await withTimeout(fn, timeoutMs);
      recordAiObservation(provider, null);
      console.info(JSON.stringify({ event: 'ai_call', provider: key, task, ok: true, latencyMs: now() - started, attempt }));
      return value;
    } catch (error) {
      const failure = classifyAiFailure(error);
      // Errores propios de la búsqueda (grounding) no degradan al proveedor completo,
      // salvo los que delatan una clave/proyecto inutilizable.
      const providerWide = key === provider || failure === 'billing' || failure === 'authentication';
      if (providerWide) recordAiObservation(provider, failure);
      console.warn(JSON.stringify({ event: 'ai_call', provider: key, task, ok: false, reason: failure, latencyMs: now() - started, attempt }));
      if (RETRYABLE.has(failure) && attempt === 0) continue;
      tripBreaker(key, failure, now());
      if (providerWide && key !== provider) tripBreaker(provider, failure, now());
      throw error;
    }
  }
  /* istanbul ignore next */
  throw new AiUnavailableError(provider, 'unreachable');
}

/**
 * Llamada interna a Gemini (counterDesk, forecast, email, fraud...): getters de
 * modelo, breaker, timeout y redacción de PII. Usa el cliente que pase quien
 * llama o el cliente compartido de geminiRuntime.
 */
export async function guardedGeminiGenerate(
  task: AiTask,
  params: { model?: string; contents: any; config?: Record<string, any> },
  opts: { client?: GoogleGenAI | null; containsPii?: boolean } = {},
): Promise<any> {
  const client = opts.client ?? getGeminiClient();
  if (!client) throw new AiUnavailableError('gemini', 'configuration_missing');
  const cfg = getAiConfig();
  const contents = opts.containsPii && !cfg.allowExternalPii ? redactContents(params.contents) : params.contents;
  const usesSearch = Array.isArray(params.config?.tools) && params.config!.tools.some((t: any) => t && 'googleSearch' in t);
  return callProvider(usesSearch ? 'gemini:search' : 'gemini', task, signal => client.models.generateContent({
    model: params.model || getLightModel(),
    contents,
    config: { ...(params.config || {}), abortSignal: signal },
  }));
}

export type RunGenerativeInput = {
  task: AiTask;
  contents: any;
  /** Herramientas de Gemini (functionDeclarations / googleSearch). Con herramientas solo se usa Gemini. */
  tools?: any[];
  config?: Record<string, any>;
  containsPii: boolean;
  model?: string;
  /** Restringe a un proveedor concreto (p. ej. el bucle de function calling). */
  provider?: AiProviderName;
};

export type RunGenerativeResult =
  | { provider: 'gemini'; model: string; response: any; text: string; latencyMs: number }
  | { provider: 'claude'; model: string; response: any; text: string; latencyMs: number }
  | { provider: 'none'; reason: string; failure?: AiFailure };

function contentsToText(contents: any): string {
  if (typeof contents === 'string') return contents;
  const list = Array.isArray(contents) ? contents : [contents];
  return list.map((c: any) => typeof c === 'string' ? c
    : Array.isArray(c?.parts) ? c.parts.map((p: any) => p?.text || '').filter(Boolean).join('\n') : '').filter(Boolean).join('\n\n');
}

/**
 * Punto único de generación. Nunca lanza: si ningún proveedor responde devuelve
 * { provider: 'none' } y quien llama usa su fallback determinista.
 */
export async function runGenerative(input: RunGenerativeInput): Promise<RunGenerativeResult> {
  const cfg = getAiConfig();
  const contents = input.containsPii && !cfg.allowExternalPii ? redactContents(input.contents) : input.contents;
  const hasTools = Boolean(input.tools?.length);
  const usesSearch = hasTools && input.tools!.some((t: any) => t && 'googleSearch' in t);
  let order = providerOrder();
  if (input.provider) order = order.filter(p => p === input.provider);
  if (hasTools) order = order.filter(p => p === 'gemini');
  if (!order.length) return { provider: 'none', reason: 'no_provider_configured' };

  let last: { reason: string; failure?: AiFailure } = { reason: 'no_provider_available' };
  for (const provider of order) {
    const key: BreakerKey = provider === 'gemini' && usesSearch ? 'gemini:search' : provider;
    const blocked = unavailableReason(key);
    if (blocked) { last = { reason: blocked }; continue; }
    const started = Date.now();
    try {
      if (provider === 'gemini') {
        const client = getGeminiClient();
        if (!client) { last = { reason: 'configuration_missing' }; continue; }
        const model = input.model || (input.task === 'concierge' || input.task === 'concierge_classifier' || input.task === 'grounded_search' ? getConciergeModel() : getLightModel());
        const config = { ...(input.config || {}), ...(hasTools ? { tools: input.tools } : {}) };
        const response: any = await callProvider(key, input.task, signal => client.models.generateContent({ model, contents, config: { ...config, abortSignal: signal } }));
        return { provider: 'gemini', model, response, text: String(response?.text ?? '').trim(), latencyMs: Date.now() - started };
      }
      const { getClaudeClient } = await import('./claudeService');
      const client = getClaudeClient();
      if (!client) { last = { reason: 'configuration_missing' }; continue; }
      const model = getClaudeModel();
      const system = typeof input.config?.systemInstruction === 'string' ? input.config.systemInstruction : undefined;
      const response: any = await callProvider('claude', input.task, signal => client.messages.create({
        model, max_tokens: 1500, ...(system ? { system } : {}),
        messages: [{ role: 'user', content: contentsToText(contents) }],
      }, { signal }));
      const text = (response?.content || []).map((b: any) => b?.type === 'text' ? b.text : '').join('').trim();
      return { provider: 'claude', model, response, text, latencyMs: Date.now() - started };
    } catch (error) {
      last = error instanceof AiUnavailableError ? { reason: error.reason } : { reason: 'provider_failed', failure: classifyAiFailure(error) };
      if (!cfg.fallbackEnabled) break;
    }
  }
  return { provider: 'none', ...last };
}
