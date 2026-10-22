import React from 'react';
import type { Currency, Language, Tour } from '../types';
import { CATEGORIES, REGIONS } from '../data/catalogMeta';
import { getLangText } from '../utils/i18n';
import { formatUsdReference } from '../utils/referencePrice';
import { useMoney } from '../hooks/useMoney';
import { TOUR_COMMERCIAL_STATUS, tourReferencePrice, tourReviewDate } from '../utils/tourResolver';
import { neutralOperatorLabel } from '../utils/operatorPrivacy';

interface Props {
  tour: Tour;
  language: Language;
  currency: Currency;
}

/**
 * Ficha factual del tour: solo datos del catálogo público. Sin ratings, reseñas,
 * cupos ni datos que identifiquen al operador (se revelan al confirmar la reserva).
 */
export const TourFacts: React.FC<Props> = ({ tour, language, currency }) => {
  const es = language === 'es';
  const lang = es ? 'es' : 'en';
  const region = REGIONS.find(r => r.id === tour.region);
  const category = CATEGORIES.find(c => c.id === tour.category);
  const price = tourReferencePrice(tour);
  const money = useMoney(currency, language);
  const view = price.amountUSD === undefined ? undefined : money(price.amountUSD);
  const reviewedAt = tourReviewDate(tour);
  const tbc = es ? 'Por confirmar' : 'To be confirmed';
  const rows: Array<[string, React.ReactNode]> = [
    [es ? 'Región' : 'Region', region ? getLangText(region.name, language) : (tour.location?.placeName || tbc)],
    [es ? 'Categoría' : 'Category', category ? getLangText(category.name, language) : tbc],
    [es ? 'Duración' : 'Duration', tour.duration || getLangText(tour.durationLabel, language) || tbc],
    [es ? 'Operador' : 'Operator', neutralOperatorLabel(tour)[lang]],
    [es ? 'Revisión' : 'Reviewed', reviewedAt ? (es ? `Revisado por nuestro equipo el ${reviewedAt}` : `Reviewed by our team on ${reviewedAt}`) : (es ? 'Catálogo interno' : 'Internal catalog')],
    [es ? 'Estado' : 'Status', TOUR_COMMERCIAL_STATUS[lang]],
  ];

  return (
    <section aria-label={es ? 'Ficha del tour' : 'Tour facts'} data-testid="tour-facts" className="rounded-[2rem] border border-white/10 bg-stone-900/60 p-6">
      <div className="mb-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-stone-400">{price.amountUSD === undefined ? (es ? 'Precio' : 'Price') : price.label[lang]}</div>
        <div className="text-3xl font-black text-amber-400">
          {price.amountUSD === undefined || !view ? price.label[lang] : <>{view.primary}{view.converted && <span className="ml-2 text-sm font-semibold text-stone-300">{formatUsdReference(price.amountUSD)}</span>}</>}
        </div>
        {view && (view.note || view.notice) && <div data-testid="rate-note" className="mt-1 text-[11px] text-stone-400">{view.note || view.notice}</div>}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-black uppercase tracking-widest text-stone-500">{label}</dt>
            <dd className="text-stone-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
