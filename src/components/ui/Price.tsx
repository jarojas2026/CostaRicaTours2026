import React from 'react';
import type { Currency, Language } from '../../types';
import { referencePriceParts } from '../../utils/referencePrice';

interface PriceProps {
  amountUSD?: number;
  currency: Currency;
  rate?: number;
  language: Language;
  variant?: 'card' | 'detail' | 'inline';
  className?: string;
}

/** Único punto de verdad para precios de catálogo. Sin tasa válida → solo USD (nunca inventa CRC). */
export function Price({ amountUSD, currency, rate, language, variant = 'card', className = '' }: PriceProps) {
  const p = referencePriceParts(amountUSD, currency, rate, language);
  if (variant === 'inline') return <span className={className}>{p.usd || p.headline}{p.approx && <span className="opacity-70"> · {p.approx}</span>}</span>;
  return (
    <div className={className}>
      <div className="text-lg font-black text-emerald-100">{p.usd || p.headline}{p.approx && <span className="ml-2 text-sm font-semibold opacity-80">{p.approx}</span>}</div>
      {variant === 'detail' && <p className="text-[11px] opacity-70 mt-0.5">{p.disclaimer}</p>}
    </div>
  );
}
