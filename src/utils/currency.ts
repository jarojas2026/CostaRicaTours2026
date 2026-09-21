/**
 * Presentación de CRC en el cliente.
 * La cotización financiera autoritativa sigue siendo la del backend;
 * el frontend solo usa esta tasa para visualización y UX.
 */
export function getClientUsdToCrcRate(): number {
  const rate = Number(import.meta.env.VITE_USD_TO_CRC_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export function convertUsdToCrc(amountUsd: number): number | null {
  const rate = getClientUsdToCrcRate();
  if (!rate) return null;
  return Math.round(Number(amountUsd || 0) * rate);
}

export function formatUsdToCrc(amountUsd: number, locale = 'es-CR'): string | null {
  const value = convertUsdToCrc(amountUsd);
  return value === null ? null : value.toLocaleString(locale);
}
