import type { Currency, Language } from '../types';

/**
 * Reference (catalog) prices are not quotes. The catalog stores a USD
 * reference; any other currency is an approximate conversion and must be
 * labelled as such. These helpers keep that wording identical in every
 * surface (home carousel, catalog cards, tour detail, assistant hand-off).
 */
export interface ReferencePriceParts {
  /** Exact USD reference, e.g. "US$85". Empty when no reference exists. */
  usd: string;
  /** Approximate conversion in the selected currency, e.g. "≈ ₡43,350 aprox.". */
  approx?: string;
  /** "Precio de referencia desde US$85, sujeto a confirmación". */
  headline: string;
  /** Short disclaimer shown under the headline. */
  disclaimer: string;
}

const isEs = (language: Language) => language === 'es';

export function formatUsdReference(amountUSD: number): string {
  const rounded = Math.round(amountUSD);
  return `US$${rounded.toLocaleString('en-US')}`;
}

/**
 * Approximate conversion. Returns undefined when the selected currency is USD
 * or when no positive exchange rate is known (never fall back to rate 1).
 */
export function formatApproxConversion(
  amountUSD: number,
  currency: Currency,
  rate: number | undefined,
  language: Language,
): string | undefined {
  if (currency === 'USD' || !rate || !Number.isFinite(rate) || rate <= 0) return undefined;
  const amount = Math.round(amountUSD * rate);
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(isEs(language) ? 'es-CR' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    formatted = `${currency} ${amount.toLocaleString('en-US')}`;
  }
  return isEs(language) ? `≈ ${formatted} aprox.` : `≈ ${formatted} approx.`;
}

export function referencePriceParts(
  amountUSD: number | undefined,
  currency: Currency,
  rate: number | undefined,
  language: Language,
): ReferencePriceParts {
  const es = isEs(language);
  if (!amountUSD || !Number.isFinite(amountUSD) || amountUSD <= 0) {
    return {
      usd: '',
      headline: es ? 'Tarifa por confirmar' : 'Price to be confirmed',
      disclaimer: es
        ? 'Confirmamos operador, precio y cupo antes de cualquier pago.'
        : 'We confirm operator, price and availability before any payment.',
    };
  }
  const usd = formatUsdReference(amountUSD);
  return {
    usd,
    approx: formatApproxConversion(amountUSD, currency, rate, language),
    headline: es ? `Precio de referencia desde ${usd}` : `Reference price from ${usd}`,
    disclaimer: es
      ? 'Sujeto a confirmación de operador, fecha y cupo.'
      : 'Subject to confirmation of operator, date and availability.',
  };
}

/** Reference total for a party, e.g. US$110 × 2 = US$220 (reference only). */
export function referenceTotalLine(amountUSD: number, people: number, language: Language): string {
  const each = formatUsdReference(amountUSD);
  const total = formatUsdReference(amountUSD * people);
  return isEs(language)
    ? `${each} × ${people} ${people === 1 ? 'persona' : 'personas'} = ${total} (referencia, sujeto a confirmación)`
    : `${each} × ${people} ${people === 1 ? 'person' : 'people'} = ${total} (reference, subject to confirmation)`;
}
