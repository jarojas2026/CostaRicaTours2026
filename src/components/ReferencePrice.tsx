import React, { useEffect, useState } from 'react';
import type { Currency, Language } from '../types';
import { EXCHANGE_RATES } from '../utils/i18n';
import { getUsdToCrcRate } from '../utils/currencies';
import { referencePriceParts } from '../utils/referencePrice';

interface ReferencePriceProps {
  amountUSD?: number;
  currency: Currency;
  language: Language;
  /** compact: one line for badges/overlays; full: headline + approx + disclaimer. */
  variant?: 'compact' | 'full';
  className?: string;
}

function currentRate(currency: Currency): number | undefined {
  const rate = EXCHANGE_RATES[currency];
  if (rate && rate > 0) return rate;
  if (currency === 'CRC') {
    const crc = getUsdToCrcRate();
    return crc > 0 ? crc : undefined;
  }
  return undefined;
}

/** Hook that re-renders when exchange rates are refreshed. */
export function useExchangeRate(currency: Currency): number | undefined {
  const [rate, setRate] = useState<number | undefined>(() => currentRate(currency));
  useEffect(() => {
    setRate(currentRate(currency));
    const update = () => setRate(currentRate(currency));
    window.addEventListener('exchangeRatesUpdated', update);
    return () => window.removeEventListener('exchangeRatesUpdated', update);
  }, [currency]);
  return rate;
}

/**
 * Single source of truth for how a catalog price is shown to travellers:
 * a USD reference, an approximate local conversion and an explicit
 * "subject to confirmation" disclaimer, identical in ES and EN.
 */
export const ReferencePrice: React.FC<ReferencePriceProps> = ({
  amountUSD,
  currency,
  language,
  variant = 'full',
  className = '',
}) => {
  const rate = useExchangeRate(currency);
  const parts = referencePriceParts(amountUSD, currency, rate, language);
  const es = language === 'es';

  if (variant === 'compact') {
    return (
      <span className={className} title={parts.disclaimer}>
        {parts.usd ? (es ? `Ref. desde ${parts.usd}` : `Ref. from ${parts.usd}`) : parts.headline}
        {parts.approx ? <span className="ml-1 font-semibold opacity-80">({parts.approx})</span> : null}
      </span>
    );
  }

  return (
    <span className={`flex flex-col ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-300">
        {parts.usd ? (es ? 'Precio de referencia desde' : 'Reference price from') : (es ? 'Precio' : 'Price')}
      </span>
      <span className="text-xl font-black text-amber-400 leading-tight">
        {parts.usd || parts.headline}
      </span>
      {parts.approx && <span className="text-[11px] font-semibold text-stone-300">{parts.approx}</span>}
      <span className="text-[10px] text-stone-400 leading-snug">{parts.disclaimer}</span>
    </span>
  );
};
