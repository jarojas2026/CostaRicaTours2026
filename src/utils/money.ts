/**
 * Conversión y formato únicos de precios (referencia en USD → moneda elegida).
 *
 * Reglas:
 * - El catálogo guarda USD. Cualquier otra moneda es una conversión aproximada
 *   ("≈") con la nota "Referencia en USD; tasa BCCR/BCE del <fecha>".
 * - Sin tasa real para la moneda elegida se muestra USD y un aviso; nunca un
 *   número sin convertir con el símbolo de otra moneda.
 * - CRC siempre en colones (₡) con formato es-CR.
 *
 * Funciones puras (sin React ni red) para poder testearlas.
 */

export type RateProvider = 'BCCR' | 'BCE' | 'runtime-config';

export interface RateSourceInfo {
  provider: RateProvider;
  rateDate: string;
}

export interface RatesSnapshot {
  /** Unidades por 1 USD. */
  rates: Record<string, number>;
  sources: Record<string, RateSourceInfo>;
  fetchedAt?: string;
}

export type MoneyLanguage = 'es' | 'en' | string;

export const EMPTY_RATES: RatesSnapshot = { rates: { USD: 1 }, sources: {} };

const isEs = (language: MoneyLanguage) => language === 'es';

/** Tasa válida (>0) para la moneda o undefined. USD siempre 1. */
export function rateFor(currency: string, snapshot: RatesSnapshot): number | undefined {
  if (currency === 'USD') return 1;
  const rate = Number(snapshot.rates?.[currency]);
  if (!Number.isFinite(rate) || rate <= 0) return undefined;
  // Sin fuente declarada no se considera una tasa real.
  if (!snapshot.sources?.[currency]) return undefined;
  return rate;
}

export function hasRate(currency: string, snapshot: RatesSnapshot): boolean {
  return rateFor(currency, snapshot) !== undefined;
}

/** Monedas que se pueden ofrecer en el selector (USD primero). */
export function availableCurrencies(snapshot: RatesSnapshot): string[] {
  const list = Object.keys(snapshot.rates || {}).filter((c) => c !== 'USD' && hasRate(c, snapshot)).sort();
  return ['USD', ...list];
}

export function formatUSD(amountUSD: number, maximumFractionDigits = 0): string {
  const factor = 10 ** maximumFractionDigits;
  const rounded = Math.round(amountUSD * factor) / factor;
  return `US$${rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits })}`;
}

/** Formatea un monto YA expresado en `currency`. CRC → ₡ con es-CR. */
export function formatAmount(amount: number, currency: string, language: MoneyLanguage): string {
  if (currency === 'USD') return formatUSD(amount);
  const locale = currency === 'CRC' ? 'es-CR' : isEs(language) ? 'es-CR' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(Math.round(amount));
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}

export function formatRateDate(rateDate: string, language: MoneyLanguage): string {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rateDate) ? Date.parse(`${rateDate}T12:00:00Z`) : NaN;
  if (!Number.isFinite(parsed)) return rateDate || (isEs(language) ? 'fecha no indicada' : 'date not given');
  return new Intl.DateTimeFormat(isEs(language) ? 'es-CR' : 'en-US', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function providerLabel(provider: RateProvider, language: MoneyLanguage): string {
  if (provider === 'BCCR') return 'BCCR';
  if (provider === 'BCE') return isEs(language) ? 'BCE' : 'ECB';
  return isEs(language) ? 'manual' : 'manual';
}

/** "Referencia en USD; tasa BCCR del 21 oct 2026". undefined para USD o sin tasa. */
export function rateNote(currency: string, language: MoneyLanguage, snapshot: RatesSnapshot): string | undefined {
  if (currency === 'USD' || !hasRate(currency, snapshot)) return undefined;
  const src = snapshot.sources[currency];
  const date = formatRateDate(src.rateDate, language);
  return isEs(language)
    ? `Referencia en USD; tasa ${providerLabel(src.provider, language)} del ${date}`
    : `USD reference; ${providerLabel(src.provider, language)} rate of ${date}`;
}

export function missingRateNotice(currency: string, language: MoneyLanguage): string {
  return isEs(language)
    ? `Sin tipo de cambio disponible para ${currency}; se muestra en USD.`
    : `No exchange rate available for ${currency}; shown in USD.`;
}

export interface MoneyView {
  /** Texto principal: "≈ ₡57 193" o "US$125". */
  primary: string;
  /** Referencia exacta en USD. */
  usd: string;
  /** Conversión aproximada (con "≈") o undefined si se muestra USD. */
  approx?: string;
  converted: boolean;
  /** Moneda en que se muestra `primary`. */
  displayCurrency: string;
  note?: string;
  /** Aviso cuando la moneda elegida no tiene tasa. */
  notice?: string;
}

export function moneyView(amountUSD: number, currency: string, language: MoneyLanguage, snapshot: RatesSnapshot): MoneyView {
  const usd = formatUSD(amountUSD);
  if (currency === 'USD') return { primary: usd, usd, converted: false, displayCurrency: 'USD' };
  const rate = rateFor(currency, snapshot);
  if (rate === undefined) {
    return { primary: usd, usd, converted: false, displayCurrency: 'USD', notice: missingRateNotice(currency, language) };
  }
  const approx = `≈ ${formatAmount(amountUSD * rate, currency, language)}`;
  return { primary: approx, usd, approx, converted: true, displayCurrency: currency, note: rateNote(currency, language, snapshot) };
}

/** Atajo de una línea para listas, marcadores y selects. */
export function formatPrice(amountUSD: number, currency: string, language: MoneyLanguage, snapshot: RatesSnapshot): string {
  return moneyView(amountUSD, currency, language, snapshot).primary;
}
