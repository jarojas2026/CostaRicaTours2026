/**
 * Estado cliente de tipos de cambio: una sola fuente, `/api/currency/rates`
 * (BCCR para CRC, BCE para el resto). Sin valores por defecto embebidos.
 */
import { EMPTY_RATES, type RatesSnapshot } from './money';

export const RATES_UPDATED_EVENT = 'exchangeRatesUpdated';

let snapshot: RatesSnapshot = EMPTY_RATES;
let inflight: Promise<RatesSnapshot> | null = null;
let lastLoadedAt = 0;
const CLIENT_TTL_MS = 30 * 60_000;

export function getRatesSnapshot(): RatesSnapshot {
  return snapshot;
}

export function setRatesSnapshot(next: RatesSnapshot) {
  snapshot = next;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RATES_UPDATED_EVENT));
}

function parse(body: any): RatesSnapshot | null {
  if (!body || typeof body.rates !== 'object' || !body.rates) return null;
  const rates: Record<string, number> = { USD: 1 };
  const sources: RatesSnapshot['sources'] = {};
  for (const [code, value] of Object.entries(body.rates)) {
    const n = Number(value);
    const src = body.sources?.[code];
    if (code === 'USD' || !/^[A-Z]{3}$/.test(code) || !Number.isFinite(n) || n <= 0 || !src?.provider) continue;
    rates[code] = n;
    sources[code] = { provider: src.provider, rateDate: String(src.rateDate || '') };
  }
  return { rates, sources, fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : undefined };
}

/** Carga (o refresca) las tasas desde el backend. Nunca lanza. */
export async function loadExchangeRates(force = false): Promise<RatesSnapshot> {
  if (!force && lastLoadedAt && Date.now() - lastLoadedAt < CLIENT_TTL_MS) return snapshot;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/currency/rates', { cache: 'no-store' });
      const parsed = parse(await res.json().catch(() => null));
      if (parsed) {
        lastLoadedAt = Date.now();
        setRatesSnapshot(parsed);
      }
    } catch (err) {
      console.warn('No se pudieron cargar los tipos de cambio:', err);
    }
    return snapshot;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
