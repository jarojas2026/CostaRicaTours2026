import { getRatesSnapshot, loadExchangeRates } from './exchangeRates';
import { rateFor } from './money';

/**
 * Las monedas ofrecidas salen de las tasas reales disponibles
 * (ver hooks/useMoney.ts → useAvailableCurrencies). USD siempre está.
 */
export const BASE_CURRENCY = 'USD';

let cachedUsdToCrcRate: number | null = null;

export function getUsdToCrcRate(): number {
  const shared = rateFor('CRC', getRatesSnapshot());
  if (shared) return shared;
  if (cachedUsdToCrcRate !== null && cachedUsdToCrcRate > 0) {
    return cachedUsdToCrcRate;
  }
  const envRate = Number(import.meta.env.VITE_USD_TO_CRC_RATE);
  if (Number.isFinite(envRate) && envRate > 0) {
    cachedUsdToCrcRate = envRate;
    return cachedUsdToCrcRate;
  }
  return 0;
}

export async function fetchLiveExchangeRate(): Promise<number> {
  const shared = rateFor('CRC', await loadExchangeRates(true));
  if (shared) return shared;
  try {
    const res = await fetch('/api/currency/exchange-rate', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      // `usdToCrc` is the canonical server contract. Older aliases remain
      // accepted for backwards compatibility with previous deployments.
      const rate = Number(data.usdToCrc ?? data.rate ?? data.USD_TO_CRC ?? data.crcRate);
      if (Number.isFinite(rate) && rate > 0) {
        cachedUsdToCrcRate = rate;
        return rate;
      }
    }
  } catch (err) {
    console.warn('No se pudo obtener el tipo de cambio dinámico:', err);
  }
  return getUsdToCrcRate();
}

export function formatCrc(usdAmount: number, rate?: number): string {
  const effectiveRate = rate && rate > 0 ? rate : getUsdToCrcRate();
  if (effectiveRate <= 0) return '';
  const crc = Math.round(usdAmount * effectiveRate);
  return `₡${crc.toLocaleString('es-CR')}`;
}

