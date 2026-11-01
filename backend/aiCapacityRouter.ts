/**
 * Capacidad de IA para picos (miles de consultas): cola con concurrencia acotada,
 * enfriamiento exponencial por "slot" ante 429/5xx y cadena de slots
 * OpenAI-compatibles:
 *
 *   1. primary  → OPENAI_COMPAT_* (el proveedor compatible que ya existe).
 *   2. free     → AI_FREE_FALLBACK_* (p. ej. OpenRouter). El modelo DEBE terminar
 *                 en ":free"; si no, el slot se descarta (garantía de $0).
 *   3. paid     → AI_PAID_SLOT_* solo si AI_PAID_SLOT_ENABLED=true **y**
 *                 AI_MAX_COST_USD > 0. Por defecto apagado.
 *
 * Todas las claves se leen en el servidor (env/Secret Manager). Nunca VITE_*.
 * Si no hay slot disponible o la cola está llena se lanza un error con status 429
 * para que quien llama use su respuesta determinista (knowledgeReplies).
 *
 * Aditivo y sin cablear: firma compatible con openAiCompatChat. Ver
 * docs/ia-capacidad-multiproveedor.md para la línea de cableado en aiRouter.ts.
 */
import { getAiConfig, getOpenAiCompatConfig } from './aiConfig';
import { openAiCompatChat, type CompatMessage } from './openaiCompatClient';

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;
const str = (v: string | undefined) => String(v ?? '').trim();
const int = (v: string | undefined, def: number, min: number, max: number) => {
  const n = Number(str(v));
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const httpsOk = (url: string) => /^https:\/\/[^\s]+$/i.test(url);

export type CapacitySlotName = 'primary' | 'free' | 'paid';
export type CapacitySlot = { name: CapacitySlotName; env: Record<string, string> };

/** Construye la cadena de slots usable. Nunca incluye el slot de pago con presupuesto 0. */
export function capacitySlots(env: Env = process.env): CapacitySlot[] {
  const slots: CapacitySlot[] = [];
  // GROQ_MODEL_FALLBACK solo aplica al slot primario (Groq); los demás slots no heredan respaldo.
  const mk = (name: CapacitySlotName, baseUrl: string, key: string, model: string, fallbackModel = '') => {
    if (!httpsOk(baseUrl) || key.length < 20 || !model) return;
    slots.push({ name, env: { OPENAI_COMPAT_BASE_URL: baseUrl, OPENAI_COMPAT_API_KEY: key, OPENAI_COMPAT_MODEL: model,
      GROQ_MODEL_FALLBACK: fallbackModel || 'none',
      OPENAI_COMPAT_MAX_TOKENS: str(env.OPENAI_COMPAT_MAX_TOKENS), OPENAI_COMPAT_REASONING_EFFORT: str(env.OPENAI_COMPAT_REASONING_EFFORT) } });
  };
  const primaryCfg = getOpenAiCompatConfig(env);
  mk('primary', str(env.OPENAI_COMPAT_BASE_URL), str(env.OPENAI_COMPAT_API_KEY), primaryCfg.model, primaryCfg.fallbackModel);
  const freeModel = str(env.AI_FREE_FALLBACK_MODEL);
  if (/:free$/i.test(freeModel)) {
    mk('free', str(env.AI_FREE_FALLBACK_BASE_URL) || 'https://openrouter.ai/api/v1', str(env.AI_FREE_FALLBACK_API_KEY), freeModel);
  }
  const paidAllowed = str(env.AI_PAID_SLOT_ENABLED).toLowerCase() === 'true' && getAiConfig(env).maxCostUsd > 0;
  if (paidAllowed) mk('paid', str(env.AI_PAID_SLOT_BASE_URL), str(env.AI_PAID_SLOT_API_KEY), str(env.AI_PAID_SLOT_MODEL));
  return slots;
}

export function capacityConfig(env: Env = process.env) {
  return {
    maxConcurrency: int(env.AI_CAPACITY_MAX_CONCURRENCY, 4, 1, 64),
    maxQueue: int(env.AI_CAPACITY_MAX_QUEUE, 50, 0, 10_000),
    queueTimeoutMs: int(env.AI_CAPACITY_QUEUE_TIMEOUT_MS, 8_000, 100, 60_000),
    baseCooldownMs: int(env.AI_CAPACITY_BASE_COOLDOWN_MS, 2_000, 100, 60_000),
    maxCooldownMs: int(env.AI_CAPACITY_MAX_COOLDOWN_MS, 60_000, 1_000, 600_000),
  };
}

// ---------------------------------------------------------------------------
// Cola con concurrencia acotada (por instancia)
// ---------------------------------------------------------------------------
type Waiter = { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
const state = { inFlight: 0, queue: [] as Waiter[], cooldown: new Map<CapacitySlotName, { until: number; strikes: number }>() };

export function resetCapacityState() {
  for (const w of state.queue) clearTimeout(w.timer);
  state.inFlight = 0; state.queue.length = 0; state.cooldown.clear();
}
export function capacityStatus(env: Env = process.env, now = Date.now()) {
  return {
    slots: capacitySlots(env).map(s => ({ name: s.name, coolingDown: (state.cooldown.get(s.name)?.until ?? 0) > now })),
    inFlight: state.inFlight,
    queued: state.queue.length,
  };
}

const capacityError = (code: string) => Object.assign(new Error(`ai_capacity:${code}`), { status: 429, code });

async function acquire(cfg: ReturnType<typeof capacityConfig>) {
  if (state.inFlight < cfg.maxConcurrency) { state.inFlight++; return; }
  if (state.queue.length >= cfg.maxQueue) throw capacityError('queue_full');
  await new Promise<void>((resolve, reject) => {
    const waiter: Waiter = {
      resolve: () => { clearTimeout(waiter.timer); state.inFlight++; resolve(); },
      reject,
      timer: setTimeout(() => {
        const i = state.queue.indexOf(waiter);
        if (i >= 0) state.queue.splice(i, 1);
        reject(capacityError('queue_timeout'));
      }, cfg.queueTimeoutMs),
    };
    state.queue.push(waiter);
  });
}
function release() {
  state.inFlight = Math.max(0, state.inFlight - 1);
  const next = state.queue.shift();
  if (next) next.resolve();
}

const RETRYABLE_STATUS = (status: number) => status === 429 || status === 408 || status >= 500;

/** Enfriamiento exponencial con jitter: base × 2^(strikes-1), tope maxCooldownMs. */
export function cooldownMs(strikes: number, cfg: ReturnType<typeof capacityConfig>, random = Math.random) {
  const raw = Math.min(cfg.maxCooldownMs, cfg.baseCooldownMs * 2 ** Math.max(0, strikes - 1));
  return Math.round(raw * (0.8 + 0.4 * random()));
}

export type CapacityChatParams = { messages: CompatMessage[]; tools?: any[]; signal?: AbortSignal; maxTokens?: number };
export type CapacityDeps = {
  env?: Env;
  now?: () => number;
  random?: () => number;
  chat?: (params: CapacityChatParams, env: NodeJS.ProcessEnv) => Promise<any>;
};

/**
 * Igual que openAiCompatChat pero con cola y cadena de slots. Devuelve la
 * respuesta del primer slot que contesta; añade `_capacitySlot` (solo para logs
 * internos, nunca al cliente).
 */
export async function capacityChat(params: CapacityChatParams, deps: CapacityDeps = {}): Promise<any> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? Date.now;
  const chat = deps.chat ?? openAiCompatChat;
  const cfg = capacityConfig(env);
  const slots = capacitySlots(env);
  if (!slots.length) throw Object.assign(new Error('ai_capacity:no_slot'), { status: 401, code: 'no_slot' });

  await acquire(cfg);
  try {
    let lastError: any = capacityError('all_cooling_down');
    for (const slot of slots) {
      const cd = state.cooldown.get(slot.name);
      if (cd && cd.until > now()) continue;
      try {
        const response = await chat(params, slot.env as NodeJS.ProcessEnv);
        state.cooldown.delete(slot.name);
        console.info(JSON.stringify({ event: 'ai_capacity', slot: slot.name, ok: true }));
        return Object.assign(response ?? {}, { _capacitySlot: slot.name });
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.status) || 0;
        console.warn(JSON.stringify({ event: 'ai_capacity', slot: slot.name, ok: false, status }));
        if (status === 401 || status === 403 || RETRYABLE_STATUS(status) || error?.name === 'AbortError') {
          const strikes = (cd?.strikes ?? 0) + 1;
          state.cooldown.set(slot.name, { strikes, until: now() + cooldownMs(strikes, cfg, deps.random) });
          continue;
        }
        throw error; // 400 u otro error de la petición: no tiene sentido otro slot
      }
    }
    throw lastError;
  } finally {
    release();
  }
}
