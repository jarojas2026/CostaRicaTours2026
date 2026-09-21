export const CURRENCIES = [
  "USD", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "FOK", "GBP", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KID", "KMF", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TVD", "TWD", "TZS", "UAH", "UGX", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR", "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWL"
];

let cachedUsdToCrcRate: number | null = null;

export function getUsdToCrcRate(): number {
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
  try {
    const res = await fetch('/api/currency/exchange-rate');
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data.rate || data.USD_TO_CRC || data.crcRate);
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

