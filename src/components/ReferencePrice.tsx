import React from 'react';
import type { Currency, Language } from '../types';
import { referencePriceParts } from '../utils/referencePrice';
import { rateFor } from '../utils/money';
import { useRates } from '../hooks/useMoney';

interface ReferencePriceProps {
  amountUSD?: number;
  currency: Currency;
  language: Language;
  /** compact: one line for badges/overlays; full: headline + approx + disclaimer. */
  variant?: 'compact' | 'full';
  className?: string;
}

/** Tasa real (BCCR/BCE) para la moneda elegida, o undefined. Se actualiza sola. */
export function useExchangeRate(currency: Currency): number | undefined {
  return rateFor(currency, useRates());
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
  const rates = useRates();
  const parts = referencePriceParts(amountUSD, currency, rateFor(currency, rates), language, rates);
  const es = language === 'es';

  if (variant === 'compact') {
    return (
      <span className={className} title={[parts.rateNote || parts.rateNotice, parts.disclaimer].filter(Boolean).join(' · ')}>
        {parts.approx
          ? <>{es ? `Desde ${parts.approx}` : `From ${parts.approx}`}<span className="ml-1 font-semibold opacity-80">({parts.usd})</span></>
          : parts.usd ? (es ? `Ref. desde ${parts.usd}` : `Ref. from ${parts.usd}`) : parts.headline}
      </span>
    );
  }

  return (
    <span className={`flex flex-col ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-300">
        {parts.usd ? (es ? 'Precio de referencia desde' : 'Reference price from') : (es ? 'Precio' : 'Price')}
      </span>
      <span className="text-xl font-black text-amber-400 leading-tight">
        {parts.approx || parts.usd || parts.headline}
      </span>
      {parts.approx && <span className="text-[11px] font-semibold text-stone-300">{parts.usd}</span>}
      {(parts.rateNote || parts.rateNotice) && <span data-testid="rate-note" className="text-[10px] text-stone-400 leading-snug">{parts.rateNote || parts.rateNotice}</span>}
      <span className="text-[10px] text-stone-400 leading-snug">{parts.disclaimer}</span>
    </span>
  );
};
