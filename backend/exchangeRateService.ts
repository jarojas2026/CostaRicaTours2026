/**
 * Fuente única de tipos de cambio (base USD).
 *
 * - USD↔CRC: tipo de cambio de referencia del BCCR publicado por el Ministerio
 *   de Hacienda (api.hacienda.go.cr), valor de venta.
 * - Resto de monedas: Frankfurter v1 (api.frankfurter.dev), datos de referencia
 *   del Banco Central Europeo. Sin clave; su FAQ permite uso comercial y caché.
 *
 * Caché de 6 h en memoria y en Firestore (`exchange_rates/latest`) con fecha y
 * fuente de cada tasa. Nunca se inventa un valor: si una fuente falla, esa
 * moneda simplemente no aparece en `rates` y se lista en `unavailable`.
 */

import { getFirestoreDb } from './bookingService';

export const RATE_CACHE_TTL_MS = 6 * 60 * 60_000;
/** Una tasa real con fecha puede servirse marcada como `stale` hasta 72 h si la fuente cae. */
export const RATE_STALE_MAX_MS = 72 * 60 * 60_000;
/** Si una fuente falló, se reintenta pronto en lugar de esperar 6 h. */
export const RATE_RETRY_TTL_MS = 10 * 60_000;

export const HACIENDA_URL = 'https://api.hacienda.go.cr/indicadores/tc/dolar';
export const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?base=USD';

export type RateProvider = 'BCCR' | 'BCE' | 'runtime-config';

export interface RateSource {
  provider: RateProvider;
  /** Fecha oficial de la tasa (YYYY-MM-DD) según la fuente. */
  rateDate: string;
  label: string;
}

export interface ExchangeRateSnapshot {
  base: 'USD';
  /** Unidades de cada moneda por 1 USD. USD siempre es 1. */
  rates: Record<string, number>;
  sources: Record<string, RateSource>;
  /** Monedas cuya fuente falló en esta consulta. */
  unavailable: string[];
  /** Compra BCCR (informativo). */
  usdToCrcBuy?: number;
  fetchedAt: string;
  stale: boolean;
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

interface StoreLike {
  read(): Promise<ExchangeRateSnapshot | null>;
  write(snapshot: ExchangeRateSnapshot): Promise<void>;
}

export interface ExchangeRateDeps {
  fetch: FetchLike;
  store: StoreLike | null;
  now: () => number;
  configuredUsdToCrc?: () => number | undefined;
}

const BCCR_LABEL = 'BCCR vía Ministerio de Hacienda (api.hacienda.go.cr), tipo de cambio de venta';
const BCE_LABEL = 'Banco Central Europeo vía Frankfurter (api.frankfurter.dev)';

function firestoreStore(): StoreLike | null {
  return {
    async read() {
      const db = getFirestoreDb();
      if (!db) return null;
      const snap = await db.collection('exchange_rates').doc('latest').get();
      return snap.exists ? (snap.data() as ExchangeRateSnapshot) : null;
    },
    async write(snapshot) {
      const db = getFirestoreDb();
      if (!db) return;
      await db.collection('exchange_rates').doc('latest').set(snapshot);
    },
  };
}

const defaultDeps: ExchangeRateDeps = {
  fetch: (url, init) => fetch(url, init as RequestInit) as any,
  store: firestoreStore(),
  now: () => Date.now(),
  configuredUsdToCrc: () => {
    const v = Number(process.env.USD_TO_CRC_RATE);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  },
};

let deps: ExchangeRateDeps = defaultDeps;
let memoryCache: ExchangeRateSnapshot | null = null;
let inflight: Promise<ExchangeRateSnapshot> | null = null;

/** Solo para tests: inyecta red/almacén/reloj falsos y limpia la caché. */
export function __setExchangeRateDepsForTests(next: Partial<ExchangeRateDeps> | null) {
  deps = next ? { ...defaultDeps, ...next } : defaultDeps;
  memoryCache = null;
  inflight = null;
}

async function fetchBccr(): Promise<{ rate: number; buy?: number; date: string }> {
  const res = await deps.fetch(HACIENDA_URL, { signal: AbortSignal.timeout(6_000) });
  if (!res.ok) throw new Error(`Hacienda ${res.status}`);
  const data = await res.json();
  const rate = Number(data?.venta?.valor);
  const buy = Number(data?.compra?.valor);
  if (!Number.isFinite(rate) || rate < 300 || rate > 1000) throw new Error('Tipo de cambio BCCR fuera de rango');
  return { rate, buy: Number.isFinite(buy) && buy > 0 ? buy : undefined, date: String(data?.venta?.fecha || '') };
}

async function fetchEcb(): Promise<{ rates: Record<string, number>; date: string }> {
  const res = await deps.fetch(FRANKFURTER_URL, { signal: AbortSignal.timeout(6_000) });
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = await res.json();
  if (data?.base !== 'USD' || typeof data?.rates !== 'object' || !data.rates) throw new Error('Respuesta BCE inválida');
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(data.rates)) {
    const n = Number(value);
    if (/^[A-Z]{3}$/.test(code) && Number.isFinite(n) && n > 0) rates[code] = n;
  }
  return { rates, date: String(data?.date || '') };
}

function isFresh(snapshot: ExchangeRateSnapshot | null, maxAgeMs: number): snapshot is ExchangeRateSnapshot {
  if (!snapshot?.fetchedAt) return false;
  const age = deps.now() - Date.parse(snapshot.fetchedAt);
  return Number.isFinite(age) && age >= 0 && age < maxAgeMs;
}

async function buildLiveSnapshot(previous: ExchangeRateSnapshot | null): Promise<ExchangeRateSnapshot> {
  const [bccr, ecb] = await Promise.allSettled([fetchBccr(), fetchEcb()]);
  const rates: Record<string, number> = { USD: 1 };
  const sources: Record<string, RateSource> = {};
  const unavailable: string[] = [];
  let usdToCrcBuy: number | undefined;
  let stale = false;
  const prevUsable = previous && isFresh(previous, RATE_STALE_MAX_MS) ? previous : null;

  if (ecb.status === 'fulfilled') {
    for (const [code, value] of Object.entries(ecb.value.rates)) {
      if (code === 'USD' || code === 'CRC') continue;
      rates[code] = value;
      sources[code] = { provider: 'BCE', rateDate: ecb.value.date, label: BCE_LABEL };
    }
  } else if (prevUsable) {
    for (const [code, src] of Object.entries(prevUsable.sources)) {
      if (src.provider === 'BCE' && prevUsable.rates[code] > 0) {
        rates[code] = prevUsable.rates[code];
        sources[code] = src;
        stale = true;
      }
    }
  } else {
    unavailable.push('BCE');
  }

  if (bccr.status === 'fulfilled') {
    rates.CRC = bccr.value.rate;
    usdToCrcBuy = bccr.value.buy;
    sources.CRC = { provider: 'BCCR', rateDate: bccr.value.date, label: BCCR_LABEL };
  } else if (prevUsable?.rates.CRC && prevUsable.sources.CRC?.provider === 'BCCR') {
    rates.CRC = prevUsable.rates.CRC;
    sources.CRC = prevUsable.sources.CRC;
    usdToCrcBuy = prevUsable.usdToCrcBuy;
    stale = true;
  } else {
    unavailable.push('CRC');
  }

  const snapshot: ExchangeRateSnapshot = {
    base: 'USD',
    rates,
    sources,
    unavailable,
    fetchedAt: new Date(deps.now()).toISOString(),
    stale,
  };
  if (usdToCrcBuy) snapshot.usdToCrcBuy = usdToCrcBuy;
  return snapshot;
}

function applyRuntimeOverride(snapshot: ExchangeRateSnapshot): ExchangeRateSnapshot {
  const configured = deps.configuredUsdToCrc?.();
  if (!configured) return snapshot;
  return {
    ...snapshot,
    rates: { ...snapshot.rates, CRC: configured },
    sources: {
      ...snapshot.sources,
      CRC: { provider: 'runtime-config', rateDate: snapshot.fetchedAt.slice(0, 10), label: 'Configuración manual (USD_TO_CRC_RATE)' },
    },
    unavailable: snapshot.unavailable.filter((c) => c !== 'CRC'),
  };
}

/** Devuelve las tasas vigentes (memoria → Firestore → fuentes en vivo). */
export async function getExchangeRates(): Promise<ExchangeRateSnapshot> {
  const memoryTtl = memoryCache && (memoryCache.stale || memoryCache.unavailable.length) ? RATE_RETRY_TTL_MS : RATE_CACHE_TTL_MS;
  if (isFresh(memoryCache, memoryTtl)) return applyRuntimeOverride(memoryCache);
  if (inflight) return applyRuntimeOverride(await inflight);

  inflight = (async () => {
    let stored: ExchangeRateSnapshot | null = null;
    try {
      stored = deps.store ? await deps.store.read() : null;
    } catch {
      stored = null;
    }
    if (isFresh(stored, RATE_CACHE_TTL_MS) && !stored.unavailable?.length) {
      memoryCache = stored;
      return stored;
    }
    const live = await buildLiveSnapshot(stored ?? memoryCache);
    memoryCache = live;
    // Solo persiste instantáneas con datos frescos de al menos una fuente.
    if (!live.stale && Object.keys(live.sources).length > 0 && deps.store) {
      deps.store.write(live).catch((err) => console.warn('exchange_rates: no se pudo guardar en Firestore', err?.message));
    }
    return live;
  })();

  try {
    return applyRuntimeOverride(await inflight);
  } finally {
    inflight = null;
  }
}

/** Monedas con tasa real disponible (USD siempre). */
export function availableCurrencies(snapshot: ExchangeRateSnapshot): string[] {
  return Object.keys(snapshot.rates).filter((c) => snapshot.rates[c] > 0).sort((a, b) => (a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b)));
}
