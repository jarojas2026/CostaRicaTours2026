import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { Language, Tour } from '../types';

interface Props {
  tour: Tour;
  language: Language;
  className?: string;
  /** compact: una línea para tarjetas; full: incluye enlace a la fuente y fecha de revisión. */
  variant?: 'compact' | 'full';
}

/**
 * Transparencia de precio para tours de operadores aún no integrados:
 * quién publica el precio y que la disponibilidad se confirma antes de pagar.
 */
export const OperatorPriceSource: React.FC<Props> = ({ tour, language, className = '', variant = 'full' }) => {
  if (tour.priceSource !== 'publicado_por_operador' || !tour.operatorName) return null;
  const es = language === 'es';
  const groupPrice = tour.priceNote?.startsWith('precio_por_grupo_o_bote');
  const priceLine = tour.priceUSD <= 0
    ? (groupPrice
        ? (es ? 'Precio por grupo o bote · consultar precio' : 'Per group or boat price · ask for price')
        : (es ? 'Consultar precio' : 'Ask for price'))
    : (es ? 'Precio publicado por el operador · consultar disponibilidad' : 'Price published by the operator · check availability');
  return (
    <span className={`block text-[10px] text-stone-400 font-medium leading-snug ${className}`}>
      <span className="block">{priceLine}</span>
      <span className="block text-stone-300">
        {es ? 'Operador: ' : 'Operator: '}{tour.operatorName}
        {variant === 'full' && tour.sourceUrl && (
          <a
            href={tour.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={(e) => e.stopPropagation()}
            className="ml-1 inline-flex items-center gap-0.5 underline decoration-emerald-500/40 hover:text-amber-400"
          >
            {es ? 'fuente' : 'source'}<ExternalLink className="w-3 h-3" />
          </a>
        )}
      </span>
      {variant === 'full' && tour.priceCheckedAt && (
        <span className="block">{es ? `Revisado el ${tour.priceCheckedAt}` : `Checked on ${tour.priceCheckedAt}`}</span>
      )}
    </span>
  );
};
