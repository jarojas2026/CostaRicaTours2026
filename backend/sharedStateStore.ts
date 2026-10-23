/**
 * Estado compartido entre instancias (contadores de rate-limit y locks cortos).
 *
 * Hoy los límites viven en memoria de cada instancia (formAbuseGuard,
 * express-rate-limit sin store) y no se comparten entre Cloud Run/Vercel.
 * Este módulo ofrece una interfaz única con dos backends:
 *
 * - memory (por defecto, $0): exactamente el comportamiento actual, por instancia.
 * - upstash (opcional, puede tener costo): Redis REST vía fetch, sin SDK nuevo.
 *   Se activa SOLO con SHARED_STATE_STORE=upstash + UPSTASH_REDIS_REST_URL (https)
 *   + UPSTASH_REDIS_REST_TOKEN, todos leídos en el servidor. Nunca VITE_*.
 *
 * Fallback: si Redis falla o tarda (>SHARED_STATE_TIMEOUT_MS, 800 ms por defecto),
 * la operación cae al store en memoria y se registra un aviso sin datos de la clave.
 * El tráfico nunca se bloquea por una caída del store.
 *
 * Nota: los locks de cron ya tienen un lock gratuito en Firestore
 * (cronEngine.withDistributedAutomationLock); este lock es para usos cortos.
 */
import crypto from 'node:crypto';
import type { ClientRateLimitInfo, Store } from 'express-rate-limit';

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;
const str = (v: string | undefined) => String(v ?? '').trim();

export interface SharedStateStore {
  readonly kind: 'memory' | 'upstash';
  incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  decr(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  acquireLock(key: string, ttlMs: number): Promise<string | null>;
  releaseLock(key: string, token: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Memoria (por instancia)
// ---------------------------------------------------------------------------
const MAX_KEYS = 20_000;

export class MemoryStateStore implements SharedStateStore {
  readonly kind = 'memory' as const;
  private counters = new Map<string, { count: number; resetAt: number }>();
  private locks = new Map<string, { token: string; until: number }>();
  constructor(private now: () => number = Date.now) {}

  async incr(key: string, windowMs: number) {
    const t = this.now();
    let entry = this.counters.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      if (this.counters.size >= MAX_KEYS) this.sweep(t);
    }
    entry.count += 1;
    this.counters.set(key, entry);
    return { ...entry };
  }
  async decr(key: string) { const e = this.counters.get(key); if (e && e.count > 0) e.count -= 1; }
  async reset(key: string) { this.counters.delete(key); }
  async acquireLock(key: string, ttlMs: number) {
    const t = this.now();
    const cur = this.locks.get(key);
    if (cur && cur.until > t) return null;
    const token = crypto.randomUUID();
    this.locks.set(key, { token, until: t + ttlMs });
    return token;
  }
  async releaseLock(key: string, token: string) { if (this.locks.get(key)?.token === token) this.locks.delete(key); }
  private sweep(t: number) {
    for (const [k, v] of this.counters) if (v.resetAt <= t) this.counters.delete(k);
    while (this.counters.size >= MAX_KEYS) this.counters.delete(this.counters.keys().next().value as string);
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis REST (opcional)
// ---------------------------------------------------------------------------
const RELEASE_SCRIPT = "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";

export class UpstashStateStore implements SharedStateStore {
  readonly kind = 'upstash' as const;
  constructor(
    private cfg: { url: string; token: string; prefix: string; timeoutMs: number },
    private fallback: SharedStateStore = new MemoryStateStore(),
    private fetchImpl: typeof fetch = fetch,
    private now: () => number = Date.now,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<any[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.cfg.url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`shared_state_http_${res.status}`);
      const out: any = await res.json();
      if (!Array.isArray(out) || out.some(r => r && r.error)) throw new Error('shared_state_command_error');
      return out.map(r => r?.result);
    } finally {
      clearTimeout(timer);
    }
  }
  private k(key: string) { return `${this.cfg.prefix}${key}`; }
  private warn(op: string, error: unknown) {
    console.warn('[shared-state] fallback a memoria', JSON.stringify({ op, reason: String((error as any)?.message || error).slice(0, 60) }));
  }

  async incr(key: string, windowMs: number) {
    try {
      const [count, , pttl] = await this.pipeline([['INCR', this.k(key)], ['PEXPIRE', this.k(key), windowMs, 'NX'], ['PTTL', this.k(key)]]);
      const ttl = Number(pttl) > 0 ? Number(pttl) : windowMs;
      return { count: Number(count), resetAt: this.now() + ttl };
    } catch (e) { this.warn('incr', e); return this.fallback.incr(key, windowMs); }
  }
  async decr(key: string) {
    try { await this.pipeline([['DECR', this.k(key)]]); } catch (e) { this.warn('decr', e); await this.fallback.decr(key); }
  }
  async reset(key: string) {
    try { await this.pipeline([['DEL', this.k(key)]]); } catch (e) { this.warn('reset', e); await this.fallback.reset(key); }
  }
  async acquireLock(key: string, ttlMs: number) {
    const token = crypto.randomUUID();
    try {
      const [ok] = await this.pipeline([['SET', this.k(`lock:${key}`), token, 'NX', 'PX', ttlMs]]);
      return ok === 'OK' ? token : null;
    } catch (e) { this.warn('lock', e); return this.fallback.acquireLock(key, ttlMs); }
  }
  async releaseLock(key: string, token: string) {
    try { await this.pipeline([['EVAL', RELEASE_SCRIPT, 1, this.k(`lock:${key}`), token]]); }
    catch (e) { this.warn('unlock', e); await this.fallback.releaseLock(key, token); }
  }
}

// ---------------------------------------------------------------------------
// Selección por entorno
// ---------------------------------------------------------------------------
export function sharedStateConfig(env: Env = process.env) {
  const requested = str(env.SHARED_STATE_STORE).toLowerCase();
  const url = str(env.UPSTASH_REDIS_REST_URL).replace(/\/+$/, '');
  const token = str(env.UPSTASH_REDIS_REST_TOKEN);
  const configured = /^https:\/\/[^\s]+$/i.test(url) && token.length >= 20;
  const timeout = Number(str(env.SHARED_STATE_TIMEOUT_MS) || '800');
  return {
    kind: (requested === 'upstash' && configured ? 'upstash' : 'memory') as 'memory' | 'upstash',
    requested: requested || 'memory',
    configured,
    url,
    token,
    prefix: str(env.SHARED_STATE_PREFIX) || 'crt:',
    timeoutMs: Number.isFinite(timeout) ? Math.min(5_000, Math.max(100, Math.round(timeout))) : 800,
  };
}

export function createSharedStateStore(env: Env = process.env, fetchImpl: typeof fetch = fetch): SharedStateStore {
  const cfg = sharedStateConfig(env);
  if (cfg.kind === 'upstash') return new UpstashStateStore({ url: cfg.url, token: cfg.token, prefix: cfg.prefix, timeoutMs: cfg.timeoutMs }, new MemoryStateStore(), fetchImpl);
  return new MemoryStateStore();
}

let singleton: SharedStateStore | null = null;
export function getSharedStateStore(): SharedStateStore {
  if (!singleton) singleton = createSharedStateStore();
  return singleton;
}
export function resetSharedStateStoreForTests() { singleton = null; }

/** Estado sin secretos para /admin. */
export function sharedStateStatus(env: Env = process.env) {
  const cfg = sharedStateConfig(env);
  return { kind: cfg.kind, requested: cfg.requested, configured: cfg.configured };
}

/**
 * Store para express-rate-limit. Devuelve `{}` cuando el modo es memoria para
 * que express-rate-limit use su MemoryStore de siempre (cero cambio de conducta).
 * Uso: rateLimit({ windowMs, limit, ...rateLimitStoreOption('chat', windowMs) }).
 */
export function rateLimitStoreOption(prefix: string, windowMs: number, env: Env = process.env, store?: SharedStateStore): { store?: Store } {
  if (sharedStateConfig(env).kind !== 'upstash' && !store) return {};
  const s = store ?? getSharedStateStore();
  const ns = (key: string) => `rl:${prefix}:${key}`;
  const adapter: Store = {
    prefix: `rl:${prefix}:`,
    localKeys: false,
    async increment(key: string): Promise<ClientRateLimitInfo> {
      const r = await s.incr(ns(key), windowMs);
      return { totalHits: r.count, resetTime: new Date(r.resetAt) };
    },
    async decrement(key: string) { await s.decr(ns(key)); },
    async resetKey(key: string) { await s.reset(ns(key)); },
  };
  return { store: adapter };
}
