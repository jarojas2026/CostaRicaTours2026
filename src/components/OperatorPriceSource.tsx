import React from 'react';
import type { Language, Tour } from '../types';
import { neutralOperatorLabel } from '../utils/operatorPrivacy';

interface Props {
  tour: Tour;
  language: Language;
  className?: string;
  /** compact: una línea para tarjetas; full: incluye la fecha de revisión. */
  variant?: 'compact' | 'full';
}

/**
 * Transparencia de precio para tours de consulta, sin identificar al proveedor:
 * el precio es de referencia y la disponibilidad se confirma antes de pagar.
 */
export const OperatorPriceSource: React.FC<Props> = ({ tour, language, className = '', variant = 'full' }) => {
  if (tour.priceSource !== 'precio_referencia') return null;
  const es = language === 'es';
  const groupPrice = tour.priceNote?.startsWith('precio_por_grupo_o_bote');
  const priceLine = tour.priceUSD <= 0
    ? (groupPrice
        ? (es ? 'Precio por grupo o bote · consultar precio' : 'Per group or boat price · ask for price')
        : (es ? 'Consultar precio' : 'Ask for price'))
    : (es ? 'Precio de referencia, sujeto a confirmación' : 'Reference price, subject to confirmation');
  const operator = neutralOperatorLabel(tour);
  return (
    <span className={`block text-[10px] text-stone-400 font-medium leading-snug ${className}`}>
      <span className="block">{priceLine}</span>
      <span className="block text-stone-300">{es ? operator.es : operator.en}</span>
      {variant === 'full' && tour.priceCheckedAt && (
        <span className="block">{es ? `Revisado el ${tour.priceCheckedAt}` : `Checked on ${tour.priceCheckedAt}`}</span>
      )}
    </span>
  );
};
